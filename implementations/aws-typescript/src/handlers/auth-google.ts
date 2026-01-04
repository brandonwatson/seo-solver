import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  generateAuthUrl,
  generateState,
  exchangeCodeForTokens,
  calculateExpiresAt,
} from '../gsc/oauth';
import { putGoogleToken, getStateToken, putStateToken, deleteStateToken } from '../db/dynamodb';

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

function redirectResponse(url: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 302,
    headers: { Location: url },
    body: '',
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
  const path = event.rawPath;
  const method = event.requestContext.http.method;

  try {
    // GET /auth/google - Initiate OAuth flow
    if (method === 'GET' && path.includes('/auth/google') && !path.includes('/callback')) {
      return await handleInitiate(event);
    }
    // GET /auth/google/callback - Handle OAuth callback
    else if (method === 'GET' && path.includes('/auth/google/callback')) {
      return await handleCallback(event);
    }
    else {
      return errorResponse(404, 'NOT_FOUND', `Unknown auth endpoint: ${path}`);
    }
  } catch (error) {
    console.error('Auth error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Authentication failed');
  }
}

/**
 * Initiate OAuth flow - redirect to Google
 */
async function handleInitiate(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // Get optional site_id from query params (to associate tokens with a site)
  const siteId = event.queryStringParameters?.site_id;

  // Generate state for CSRF protection
  const state = generateState();

  // Store state temporarily (expires in 10 minutes)
  await putStateToken(state, {
    site_id: siteId,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  // Generate Google OAuth URL and redirect
  const authUrl = generateAuthUrl(state);

  return redirectResponse(authUrl);
}

/**
 * Handle OAuth callback from Google
 */
async function handleCallback(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const params = event.queryStringParameters || {};

  // Check for error from Google
  if (params.error) {
    return errorResponse(400, 'OAUTH_ERROR', `Google OAuth error: ${params.error}`);
  }

  // Validate required parameters
  const code = params.code;
  const state = params.state;

  if (!code || !state) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Missing code or state parameter');
  }

  // Validate state (CSRF protection)
  const stateData = await getStateToken(state);
  if (!stateData) {
    return errorResponse(400, 'INVALID_STATE', 'Invalid or expired state parameter');
  }

  // Clean up state token
  await deleteStateToken(state);

  // Check if state expired
  if (new Date(stateData.expires_at) < new Date()) {
    return errorResponse(400, 'EXPIRED_STATE', 'State parameter has expired');
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.refresh_token) {
    console.warn('No refresh token received - user may have already authorized this app');
  }

  // Generate a site_id if not provided (use a default for now)
  const siteId = stateData.site_id || 'default';

  // Store tokens
  const now = new Date().toISOString();
  await putGoogleToken({
    site_id: siteId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || '',
    expires_at: calculateExpiresAt(tokens.expires_in),
    scope: tokens.scope,
    created_at: now,
    updated_at: now,
  });

  // Return success response
  // In a real app, you'd redirect to a frontend success page
  return jsonResponse(200, {
    success: true,
    message: 'Google Search Console connected successfully',
    site_id: siteId,
    scope: tokens.scope,
  });
}
