import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  ValidationRequest,
  ValidationResponse,
  ValidationSummary,
  Issue,
  IssueCategory,
  ErrorResponse,
} from '../types';
import {
  putIssues,
  generateValidationId,
  generateIssueId,
  extractSiteId,
  issueToRecord,
  getGoogleToken,
} from '../db/dynamodb';
import { validateStructuredData } from '../validators/structured-data';
import { validateIndexing } from '../validators/indexing';
import { validatePerformance } from '../validators/performance';
import { validateMobile } from '../validators/mobile';
import { inspectUrl } from '../gsc/client';
import { mapInspectionResultToIssues } from '../gsc/issues-mapper';

const DEFAULT_CHECKS: IssueCategory[] = [
  'structured_data',
  'indexing',
  'performance',
  'mobile',
];
const DEFAULT_MAX_URLS = 50;
const MAX_URLS_LIMIT = 500;

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

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    if (!event.body) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required');
    }

    let request: ValidationRequest;
    try {
      request = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body');
    }

    // Validate required fields
    if (!request.site_url) {
      return errorResponse(400, 'VALIDATION_ERROR', 'site_url is required', {
        field: 'site_url',
      });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(request.site_url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid site_url format', {
        field: 'site_url',
        reason: 'Must be a valid HTTP or HTTPS URL',
      });
    }

    // Parse and validate options
    const checks = request.checks || DEFAULT_CHECKS;
    const maxUrls = Math.min(request.max_urls || DEFAULT_MAX_URLS, MAX_URLS_LIMIT);

    // Validate checks
    for (const check of checks) {
      if (!DEFAULT_CHECKS.includes(check)) {
        return errorResponse(400, 'VALIDATION_ERROR', `Invalid check: ${check}`, {
          field: 'checks',
          allowed: DEFAULT_CHECKS,
        });
      }
    }

    const validationId = generateValidationId();
    const siteId = request.site_id || extractSiteId(request.site_url);
    const startedAt = new Date().toISOString();

    // Check if GSC is available and requested
    let gscUsed = false;
    let gscPropertyUsed: string | undefined;

    const allIssues: Issue[] = [];
    let urlsChecked = 0;

    // For simplicity, we validate the main URL directly
    // In a full implementation, we'd fetch sitemap and validate multiple URLs
    const urlsToValidate = [request.site_url];

    // If GSC is requested, check if we have tokens
    const useGsc = request.use_gsc ?? true; // Default to using GSC if available
    const tokenRecord = useGsc ? await getGoogleToken(siteId) : null;

    if (tokenRecord && useGsc) {
      // Use GSC URL Inspection API
      const gscProperty = request.gsc_property || request.site_url;

      for (const url of urlsToValidate.slice(0, maxUrls)) {
        const result = await inspectUrl(siteId, {
          inspectionUrl: url,
          siteUrl: gscProperty,
        });

        if (result?.inspectionResult) {
          gscUsed = true;
          gscPropertyUsed = gscProperty;

          // Map GSC results to our issue format
          const gscIssues = mapInspectionResultToIssues(url, result.inspectionResult);

          // Filter by requested checks and add IDs
          for (const issue of gscIssues) {
            if (checks.includes(issue.category)) {
              allIssues.push({
                ...issue,
                id: generateIssueId(),
              });
            }
          }
        }
        urlsChecked++;
      }

      // GSC doesn't cover performance, so run performance validator if requested
      if (checks.includes('performance')) {
        for (const url of urlsToValidate.slice(0, maxUrls)) {
          const result = await validatePerformance(url);
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            id: generateIssueId(),
          })));
        }
      }
    } else {
      // Fallback to validators
      for (const url of urlsToValidate.slice(0, maxUrls)) {
        if (checks.includes('structured_data')) {
          const result = await validateStructuredData(url);
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            id: generateIssueId(),
          })));
        }

        if (checks.includes('indexing')) {
          const result = await validateIndexing(url);
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            id: generateIssueId(),
          })));
        }

        if (checks.includes('performance')) {
          const result = await validatePerformance(url);
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            id: generateIssueId(),
          })));
        }

        if (checks.includes('mobile')) {
          const result = await validateMobile(url);
          allIssues.push(...result.issues.map(issue => ({
            ...issue,
            id: generateIssueId(),
          })));
        }

        urlsChecked++;
      }
    }

    // Store issues in DynamoDB
    if (allIssues.length > 0) {
      const issueRecords = allIssues.map(issue => issueToRecord(issue, siteId));
      await putIssues(issueRecords);
    }

    // Build summary
    const summary: ValidationSummary = {
      total_issues: allIssues.length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      by_category: {
        structured_data: allIssues.filter(i => i.category === 'structured_data').length,
        indexing: allIssues.filter(i => i.category === 'indexing').length,
        performance: allIssues.filter(i => i.category === 'performance').length,
        mobile: allIssues.filter(i => i.category === 'mobile').length,
      },
    };

    const completedAt = new Date().toISOString();

    const response: ValidationResponse = {
      validation_id: validationId,
      status: 'completed',
      site_url: request.site_url,
      urls_checked: urlsChecked,
      started_at: startedAt,
      completed_at: completedAt,
      summary,
      issues: allIssues,
      gsc_used: gscUsed,
      gsc_property: gscPropertyUsed,
    };

    return jsonResponse(200, response);
  } catch (error) {
    console.error('Error in validate handler:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}
