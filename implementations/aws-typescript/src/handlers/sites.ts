import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  SiteRegistrationRequest,
  SiteRegistrationResponse,
  SiteListResponse,
  Site,
  ErrorResponse,
} from '../types';
import { getSite, putSite, listSites, extractSiteId } from '../db/dynamodb';

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
  const method = event.requestContext.http.method;

  try {
    if (method === 'GET') {
      return await handleListSites();
    } else if (method === 'POST') {
      return await handleRegisterSite(event);
    } else {
      return errorResponse(405, 'VALIDATION_ERROR', `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error('Error in sites handler:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

async function handleListSites(): Promise<APIGatewayProxyResultV2> {
  const sites = await listSites();

  const response: SiteListResponse = { sites };
  return jsonResponse(200, response);
}

async function handleRegisterSite(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  if (!event.body) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  let request: SiteRegistrationRequest;
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

  const siteId = extractSiteId(request.site_url);
  const now = new Date();
  const checkSchedule = request.check_schedule || 'daily';

  // Calculate next check based on schedule
  let nextCheck: Date;
  switch (checkSchedule) {
    case 'weekly':
      nextCheck = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'manual':
      nextCheck = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Far future
      break;
    case 'daily':
    default:
      nextCheck = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const site: Site = {
    site_id: siteId,
    site_url: request.site_url,
    sitemap_url: request.sitemap_url,
    gsc_property: request.gsc_property,
    check_schedule: checkSchedule,
    notification_webhook: request.notification_webhook,
    notification_email: request.notification_email,
    last_check: null,
    next_check: nextCheck.toISOString(),
    open_issues: 0,
    created_at: now.toISOString(),
  };

  await putSite(site);

  const response: SiteRegistrationResponse = {
    site_id: siteId,
    site_url: request.site_url,
    check_schedule: checkSchedule,
    next_check: nextCheck.toISOString(),
    created_at: now.toISOString(),
  };

  return jsonResponse(201, response);
}
