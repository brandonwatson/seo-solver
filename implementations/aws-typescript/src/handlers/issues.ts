import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  IssueListResponse,
  IssueUpdateRequest,
  IssueUpdateResponse,
  IssueStatus,
  ErrorResponse,
} from '../types';
import {
  getIssuesBySite,
  findIssueById,
  updateIssueStatus,
} from '../db/dynamodb';

function jsonResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIGatewayProxyResultV2 {
  const error: ErrorResponse = {
    error: { code: code as ErrorResponse['error']['code'], message, details },
  };
  return jsonResponse(statusCode, error);
}

const VALID_STATUSES: IssueStatus[] = ['open', 'fixing', 'fixed', 'wontfix'];

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  try {
    // GET /sites/{site_id}/issues
    if (method === 'GET' && path.includes('/sites/') && path.includes('/issues')) {
      return await handleGetIssues(event);
    }
    // PATCH /issues/{issue_id} (path may include stage prefix like /dev/issues/)
    else if (method === 'PATCH' && path.includes('/issues/')) {
      return await handleUpdateIssue(event);
    } else {
      return errorResponse(405, 'VALIDATION_ERROR', `Method ${method} not allowed on ${path}`);
    }
  } catch (error) {
    console.error('Error in issues handler:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

async function handleGetIssues(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const siteId = event.pathParameters?.site_id;

  if (!siteId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'site_id is required');
  }

  const query = event.queryStringParameters || {};
  const status = query.status as IssueStatus | undefined;
  const category = query.category;
  const severity = query.severity;
  const limit = query.limit ? parseInt(query.limit, 10) : 100;
  const cursor = query.cursor;

  // Validate status if provided
  if (status && !VALID_STATUSES.includes(status)) {
    return errorResponse(400, 'VALIDATION_ERROR', `Invalid status: ${status}`, {
      field: 'status',
      allowed: VALID_STATUSES,
    });
  }

  // Validate limit
  if (limit < 1 || limit > 500) {
    return errorResponse(400, 'VALIDATION_ERROR', 'limit must be between 1 and 500', {
      field: 'limit',
    });
  }

  const { issues, nextCursor } = await getIssuesBySite(siteId, {
    status,
    category,
    severity,
    limit,
    cursor,
  });

  // Transform IssueRecords to Issues (remove site_id, issue_id becomes id)
  const transformedIssues = issues.map(({ site_id, issue_id, ...rest }) => ({
    ...rest,
    id: issue_id,
  }));

  const response: IssueListResponse = {
    site_id: siteId,
    total_issues: transformedIssues.length, // Note: this is returned count, not total
    returned: transformedIssues.length,
    next_cursor: nextCursor,
    issues: transformedIssues,
  };

  return jsonResponse(200, response);
}

async function handleUpdateIssue(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const issueId = event.pathParameters?.issue_id;

  if (!issueId) {
    return errorResponse(400, 'VALIDATION_ERROR', 'issue_id is required');
  }

  if (!event.body) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  let request: IssueUpdateRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body');
  }

  if (!request.status) {
    return errorResponse(400, 'VALIDATION_ERROR', 'status is required', {
      field: 'status',
    });
  }

  if (!VALID_STATUSES.includes(request.status)) {
    return errorResponse(400, 'VALIDATION_ERROR', `Invalid status: ${request.status}`, {
      field: 'status',
      allowed: VALID_STATUSES,
    });
  }

  // Find the issue first (we need site_id for the update)
  const existingIssue = await findIssueById(issueId);

  if (!existingIssue) {
    return errorResponse(404, 'NOT_FOUND', `Issue ${issueId} not found`);
  }

  const updatedIssue = await updateIssueStatus(
    existingIssue.site_id,
    issueId,
    request.status
  );

  if (!updatedIssue) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update issue');
  }

  const response: IssueUpdateResponse = {
    id: issueId,
    status: request.status,
    updated_at: updatedIssue.updated_at || new Date().toISOString(),
  };

  return jsonResponse(200, response);
}
