// ============================================================
// Enums
// ============================================================

export type IssueCategory = 'structured_data' | 'indexing' | 'performance' | 'mobile';

export type IssueType =
  // Structured Data
  | 'missing_required_field'
  | 'missing_recommended_field'
  | 'invalid_field_value'
  | 'invalid_field_type'
  | 'missing_schema'
  | 'syntax_error'
  | 'duplicate_schema'
  // Indexing
  | 'duplicate_without_canonical'
  | 'conflicting_canonical'
  | 'crawled_not_indexed'
  | 'discovered_not_indexed'
  | 'blocked_by_robots'
  | 'noindex_tag'
  | 'not_found_404'
  | 'server_error_5xx'
  | 'redirect_chain'
  | 'redirect_loop'
  // Performance
  | 'poor_lcp'
  | 'needs_improvement_lcp'
  | 'poor_inp'
  | 'needs_improvement_inp'
  | 'poor_cls'
  | 'needs_improvement_cls'
  // Mobile
  | 'no_viewport'
  | 'text_too_small'
  | 'tap_targets_too_close'
  | 'content_wider_than_screen';

export type IssueSeverity = 'error' | 'warning';

export type IssueStatus = 'open' | 'fixing' | 'fixed' | 'wontfix';

export type ValidationStatus = 'processing' | 'completed' | 'failed';

export type CheckSchedule = 'daily' | 'weekly' | 'manual';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ============================================================
// Issue Types
// ============================================================

export interface IssueDetails {
  schema_type?: string;
  field?: string;
  message?: string;
  expected?: string;
  actual?: string;
  threshold?: number;
  value?: number;
  unit?: string;
  [key: string]: unknown;
}

export interface Issue {
  id: string;
  url: string;
  category: IssueCategory;
  type: IssueType;
  severity: IssueSeverity;
  status?: IssueStatus;
  details?: IssueDetails;
  auto_fixable: boolean;
  suggested_fix?: string;
  detected_at: string;
  updated_at?: string;
}

// DynamoDB representation
export interface IssueRecord extends Issue {
  site_id: string;
  issue_id: string;
}

// ============================================================
// Site Types
// ============================================================

export interface Site {
  site_id: string;
  site_url: string;
  sitemap_url?: string;
  gsc_property?: string;
  check_schedule: CheckSchedule;
  notification_webhook?: string;
  notification_email?: string;
  last_check?: string | null;
  next_check?: string;
  open_issues?: number;
  created_at?: string;
}

// ============================================================
// Validation Request/Response
// ============================================================

export interface ValidationRequest {
  site_url: string;
  sitemap_url?: string;
  gsc_property?: string;
  checks?: IssueCategory[];
  max_urls?: number;
  callback_url?: string;
  /** Use GSC as primary data source if connected */
  use_gsc?: boolean;
  /** Site ID for token lookup (default: 'default') */
  site_id?: string;
}

export interface ValidationSummary {
  total_issues: number;
  errors: number;
  warnings: number;
  by_category: {
    structured_data: number;
    indexing: number;
    performance: number;
    mobile: number;
  };
}

export interface ValidationResponse {
  validation_id: string;
  status: ValidationStatus;
  site_url: string;
  urls_checked?: number;
  urls_to_check?: number;
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
  callback_url?: string;
  summary?: ValidationSummary;
  issues?: Issue[];
  /** Whether GSC was used as the data source */
  gsc_used?: boolean;
  /** GSC property URL if different from site_url */
  gsc_property?: string;
}

// ============================================================
// Site Registration
// ============================================================

export interface SiteRegistrationRequest {
  site_url: string;
  sitemap_url?: string;
  gsc_property?: string;
  check_schedule?: CheckSchedule;
  notification_webhook?: string;
  notification_email?: string;
}

export interface SiteRegistrationResponse {
  site_id: string;
  site_url: string;
  check_schedule: CheckSchedule;
  next_check?: string;
  created_at: string;
}

export interface SiteListResponse {
  sites: Site[];
}

// ============================================================
// Issues Endpoints
// ============================================================

export interface IssueListResponse {
  site_id: string;
  total_issues: number;
  returned: number;
  next_cursor: string | null;
  issues: Issue[];
}

export interface IssueUpdateRequest {
  status: IssueStatus;
}

export interface IssueUpdateResponse {
  id: string;
  status: IssueStatus;
  updated_at: string;
}

// ============================================================
// Health
// ============================================================

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  implementation: string;
}

// ============================================================
// Error Response
// ============================================================

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================
// Validator Types
// ============================================================

export interface ValidatorResult {
  issues: Issue[];
  urls_checked: number;
}

export interface ValidatorContext {
  site_url: string;
  max_urls: number;
  html?: string;
  url?: string;
}

// ============================================================
// API Gateway Types
// ============================================================

export interface APIGatewayProxyEventV2 {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded: boolean;
  requestContext: {
    accountId: string;
    apiId: string;
    domainName: string;
    domainPrefix: string;
    http: {
      method: string;
      path: string;
      protocol: string;
      sourceIp: string;
      userAgent: string;
    };
    requestId: string;
    routeKey: string;
    stage: string;
    time: string;
    timeEpoch: number;
  };
}

export interface APIGatewayProxyResultV2 {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}
