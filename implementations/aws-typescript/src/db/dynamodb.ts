import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Site, IssueRecord, IssueStatus, Issue } from '../types';
import type { GoogleTokenRecord } from '../gsc/types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const SITES_TABLE = process.env.SITES_TABLE!;
const ISSUES_TABLE = process.env.ISSUES_TABLE!;
const TOKENS_TABLE = process.env.TOKENS_TABLE!;

// ============================================================
// Sites Operations
// ============================================================

export async function getSite(siteId: string): Promise<Site | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: SITES_TABLE,
      Key: { site_id: siteId },
    })
  );
  return (result.Item as Site) || null;
}

export async function putSite(site: Site): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: SITES_TABLE,
      Item: site,
    })
  );
}

export async function listSites(): Promise<Site[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: SITES_TABLE,
    })
  );
  return (result.Items as Site[]) || [];
}

export async function updateSiteLastCheck(
  siteId: string,
  lastCheck: string,
  nextCheck: string,
  openIssues: number
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: SITES_TABLE,
      Key: { site_id: siteId },
      UpdateExpression:
        'SET last_check = :lastCheck, next_check = :nextCheck, open_issues = :openIssues',
      ExpressionAttributeValues: {
        ':lastCheck': lastCheck,
        ':nextCheck': nextCheck,
        ':openIssues': openIssues,
      },
    })
  );
}

// ============================================================
// Issues Operations
// ============================================================

export async function getIssue(
  siteId: string,
  issueId: string
): Promise<IssueRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: ISSUES_TABLE,
      Key: { site_id: siteId, issue_id: issueId },
    })
  );
  return (result.Item as IssueRecord) || null;
}

export async function putIssue(issue: IssueRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: ISSUES_TABLE,
      Item: issue,
    })
  );
}

export async function putIssues(issues: IssueRecord[]): Promise<void> {
  // Use individual puts for now (batch write has 25 item limit)
  // Could optimize with BatchWriteCommand if needed
  for (const issue of issues) {
    await putIssue(issue);
  }
}

export interface GetIssuesOptions {
  status?: IssueStatus;
  category?: string;
  severity?: string;
  limit?: number;
  cursor?: string;
}

export async function getIssuesBySite(
  siteId: string,
  options: GetIssuesOptions = {}
): Promise<{ issues: IssueRecord[]; nextCursor: string | null }> {
  const { status, limit = 100, cursor } = options;

  let queryParams: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, string | number>;
    ExpressionAttributeNames?: Record<string, string>;
    FilterExpression?: string;
    Limit: number;
    ExclusiveStartKey?: Record<string, string>;
    IndexName?: string;
  } = {
    TableName: ISSUES_TABLE,
    KeyConditionExpression: 'site_id = :siteId',
    ExpressionAttributeValues: {
      ':siteId': siteId,
    },
    Limit: limit,
  };

  // Use status index if filtering by status
  if (status) {
    queryParams = {
      ...queryParams,
      IndexName: 'StatusIndex',
      KeyConditionExpression: 'site_id = :siteId AND #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':siteId': siteId,
        ':status': status,
      },
    };
  }

  // Add additional filters
  const filters: string[] = [];
  if (options.category) {
    filters.push('category = :category');
    queryParams.ExpressionAttributeValues[':category'] = options.category;
  }
  if (options.severity) {
    filters.push('severity = :severity');
    queryParams.ExpressionAttributeValues[':severity'] = options.severity;
  }
  if (filters.length > 0) {
    queryParams.FilterExpression = filters.join(' AND ');
  }

  // Handle pagination
  if (cursor) {
    try {
      queryParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      );
    } catch {
      // Invalid cursor, ignore
    }
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  let nextCursor: string | null = null;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      'base64'
    );
  }

  return {
    issues: (result.Items as IssueRecord[]) || [],
    nextCursor,
  };
}

export async function updateIssueStatus(
  siteId: string,
  issueId: string,
  status: IssueStatus
): Promise<IssueRecord | null> {
  const updatedAt = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: ISSUES_TABLE,
      Key: { site_id: siteId, issue_id: issueId },
      UpdateExpression: 'SET #status = :status, updated_at = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': updatedAt,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return (result.Attributes as IssueRecord) || null;
}

// Find issue by issue_id only (need to scan since we don't know site_id)
export async function findIssueById(
  issueId: string
): Promise<IssueRecord | null> {
  // This is less efficient but needed for PATCH /issues/{issue_id}
  const result = await docClient.send(
    new ScanCommand({
      TableName: ISSUES_TABLE,
      FilterExpression: 'issue_id = :issueId',
      ExpressionAttributeValues: {
        ':issueId': issueId,
      },
      Limit: 1,
    })
  );

  return (result.Items?.[0] as IssueRecord) || null;
}

// ============================================================
// Utility Functions
// ============================================================

export function generateIssueId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'iss_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateValidationId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'val_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function extractSiteId(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return siteUrl;
  }
}

export function issueToRecord(issue: Issue, siteId: string): IssueRecord {
  return {
    ...issue,
    site_id: siteId,
    issue_id: issue.id,
    status: issue.status || 'open',
  };
}

// ============================================================
// Google Token Operations
// ============================================================

export async function getGoogleToken(siteId: string): Promise<GoogleTokenRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TOKENS_TABLE,
      Key: { pk: `GOOGLE#${siteId}`, sk: 'TOKEN' },
    })
  );
  return (result.Item as GoogleTokenRecord) || null;
}

export async function putGoogleToken(token: GoogleTokenRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TOKENS_TABLE,
      Item: {
        pk: `GOOGLE#${token.site_id}`,
        sk: 'TOKEN',
        ...token,
      },
    })
  );
}

export async function deleteGoogleToken(siteId: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
  await docClient.send(
    new DeleteCommand({
      TableName: TOKENS_TABLE,
      Key: { pk: `GOOGLE#${siteId}`, sk: 'TOKEN' },
    })
  );
}

// ============================================================
// OAuth State Token Operations (for CSRF protection)
// ============================================================

export interface StateTokenData {
  site_id?: string;
  created_at: string;
  expires_at: string;
}

export async function getStateToken(state: string): Promise<StateTokenData | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TOKENS_TABLE,
      Key: { pk: `STATE#${state}`, sk: 'OAUTH' },
    })
  );
  if (!result.Item) return null;
  return {
    site_id: result.Item.site_id,
    created_at: result.Item.created_at,
    expires_at: result.Item.expires_at,
  };
}

export async function putStateToken(state: string, data: StateTokenData): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TOKENS_TABLE,
      Item: {
        pk: `STATE#${state}`,
        sk: 'OAUTH',
        ...data,
        ttl: Math.floor(new Date(data.expires_at).getTime() / 1000), // TTL for auto-cleanup
      },
    })
  );
}

export async function deleteStateToken(state: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
  await docClient.send(
    new DeleteCommand({
      TableName: TOKENS_TABLE,
      Key: { pk: `STATE#${state}`, sk: 'OAUTH' },
    })
  );
}
