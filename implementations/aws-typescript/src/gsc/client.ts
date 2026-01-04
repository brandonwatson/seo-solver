import type { GSCPropertiesResponse, URLInspectionRequest, URLInspectionResponse } from './types';
import { refreshAccessToken, isTokenExpired } from './oauth';
import { getGoogleToken, putGoogleToken } from '../db/dynamodb';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';
const SEARCH_CONSOLE_API_BASE = 'https://searchconsole.googleapis.com/v1';

/**
 * Get a valid access token for a site, refreshing if needed
 */
export async function getValidAccessToken(siteId: string): Promise<string | null> {
  const tokenRecord = await getGoogleToken(siteId);

  if (!tokenRecord) {
    return null;
  }

  // Check if token is expired and refresh if needed
  if (isTokenExpired(tokenRecord.expires_at)) {
    if (!tokenRecord.refresh_token) {
      console.error('Token expired and no refresh token available');
      return null;
    }

    try {
      const newTokens = await refreshAccessToken(tokenRecord.refresh_token);

      // Update stored tokens
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      await putGoogleToken({
        ...tokenRecord,
        access_token: newTokens.access_token,
        expires_at: expiresAt,
        updated_at: now,
      });

      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return tokenRecord.access_token;
}

/**
 * List all Search Console properties the user has access to
 */
export async function listProperties(siteId: string): Promise<GSCPropertiesResponse | null> {
  const accessToken = await getValidAccessToken(siteId);

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${GSC_API_BASE}/sites`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to list properties: ${response.status} ${error}`);
    return null;
  }

  return response.json() as Promise<GSCPropertiesResponse>;
}

/**
 * Inspect a URL using the URL Inspection API
 */
export async function inspectUrl(
  siteId: string,
  request: URLInspectionRequest
): Promise<URLInspectionResponse | null> {
  const accessToken = await getValidAccessToken(siteId);

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${SEARCH_CONSOLE_API_BASE}/urlInspection/index:inspect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to inspect URL: ${response.status} ${error}`);
    return null;
  }

  return response.json() as Promise<URLInspectionResponse>;
}
