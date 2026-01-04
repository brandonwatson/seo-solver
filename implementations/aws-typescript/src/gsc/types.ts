// Google OAuth2 types

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleTokenRecord {
  site_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamp
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
}

// Search Console API types

export interface GSCProperty {
  siteUrl: string;
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

export interface GSCPropertiesResponse {
  siteEntry: GSCProperty[];
}

export interface URLInspectionRequest {
  inspectionUrl: string;
  siteUrl: string;
  languageCode?: string;
}

export interface URLInspectionResult {
  inspectionResultLink: string;
  indexStatusResult?: {
    verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
    coverageState: string;
    robotsTxtState: string;
    indexingState: string;
    lastCrawlTime?: string;
    pageFetchState: string;
    googleCanonical?: string;
    userCanonical?: string;
    sitemap?: string[];
    referringUrls?: string[];
    crawledAs: 'DESKTOP' | 'MOBILE';
  };
  mobileUsabilityResult?: {
    verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
    issues?: Array<{
      issueType: string;
      severity: string;
      message: string;
    }>;
  };
  richResultsResult?: {
    verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
    detectedItems?: Array<{
      richResultType: string;
      items: Array<{
        name?: string;
        issues?: Array<{
          issueMessage: string;
          severity: string;
        }>;
      }>;
    }>;
  };
}

export interface URLInspectionResponse {
  inspectionResult: URLInspectionResult;
}
