import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { inspectUrl } from '../gsc/client';
import { mapInspectionResultToIssues } from '../gsc/issues-mapper';
import { getGoogleToken } from '../db/dynamodb';

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
  message: string
): APIGatewayProxyResultV2 {
  return jsonResponse(statusCode, {
    error: { code, message },
  });
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    // Get parameters
    const params = event.queryStringParameters || {};
    const inspectionUrl = params.url;
    const siteUrl = params.site_url;
    const siteId = params.site_id || 'default';

    if (!inspectionUrl) {
      return errorResponse(400, 'VALIDATION_ERROR', 'url parameter is required');
    }

    if (!siteUrl) {
      return errorResponse(400, 'VALIDATION_ERROR', 'site_url parameter is required (your GSC property URL)');
    }

    // Check if we have tokens
    const tokenRecord = await getGoogleToken(siteId);

    if (!tokenRecord) {
      return errorResponse(401, 'NOT_CONNECTED', 'Google Search Console not connected. Visit /auth/google to connect.');
    }

    // Call URL Inspection API
    const result = await inspectUrl(siteId, {
      inspectionUrl,
      siteUrl,
    });

    if (!result) {
      return errorResponse(500, 'API_ERROR', 'Failed to inspect URL. Check that the site_url matches your GSC property.');
    }

    // Map to our issue format
    const issues = mapInspectionResultToIssues(inspectionUrl, result.inspectionResult);

    return jsonResponse(200, {
      url: inspectionUrl,
      site_url: siteUrl,
      inspection_result: result.inspectionResult,
      issues,
      issues_count: issues.length,
    });
  } catch (error) {
    console.error('Error inspecting URL:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to inspect URL');
  }
}
