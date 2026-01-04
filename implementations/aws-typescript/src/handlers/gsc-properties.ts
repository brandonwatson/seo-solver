import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { listProperties } from '../gsc/client';
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
    // Get site_id from query params, default to 'default'
    const siteId = event.queryStringParameters?.site_id || 'default';

    // Check if we have tokens for this site
    const tokenRecord = await getGoogleToken(siteId);

    if (!tokenRecord) {
      return errorResponse(401, 'NOT_CONNECTED', 'Google Search Console not connected. Visit /auth/google to connect.');
    }

    // List properties
    const properties = await listProperties(siteId);

    if (!properties) {
      return errorResponse(500, 'API_ERROR', 'Failed to fetch Search Console properties');
    }

    return jsonResponse(200, {
      connected: true,
      site_id: siteId,
      properties: properties.siteEntry?.map(site => ({
        url: site.siteUrl,
        permission: site.permissionLevel,
      })) || [],
    });
  } catch (error) {
    console.error('Error listing GSC properties:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list properties');
  }
}
