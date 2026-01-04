# API Contract

All implementations must conform to this API specification. This ensures the Claude Code skill and any client can work with any backend implementation.

## Base URL

Each implementation exposes these endpoints at its base URL:
- Cloudflare: `https://seo-solver.{your-subdomain}.workers.dev`
- AWS: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`

## Authentication

All endpoints require an API key passed in the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

API keys are configured per-implementation (environment variable or secret).

---

## Endpoints

### POST /validate

Run SEO validation on a site.

**Request:**

```json
{
  "site_url": "https://www.example.com",
  "sitemap_url": "https://www.example.com/sitemap.xml",
  "gsc_property": "sc-domain:example.com",
  "checks": ["structured_data", "indexing", "performance", "mobile"],
  "max_urls": 100,
  "callback_url": "https://webhook.example.com/seo-results"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `site_url` | string | Yes | Base URL of site to validate |
| `sitemap_url` | string | No | Sitemap URL (auto-detected if not provided) |
| `gsc_property` | string | No | GSC property ID for URL Inspection API |
| `checks` | string[] | No | Which validators to run (default: all) |
| `max_urls` | number | No | Max URLs to validate (default: 50, max: 500) |
| `callback_url` | string | No | Webhook for async results |

**Response (sync, < 10 URLs):**

```json
{
  "validation_id": "val_abc123",
  "status": "completed",
  "site_url": "https://www.example.com",
  "urls_checked": 8,
  "started_at": "2025-01-04T10:00:00Z",
  "completed_at": "2025-01-04T10:00:15Z",
  "summary": {
    "total_issues": 5,
    "errors": 2,
    "warnings": 3,
    "by_category": {
      "structured_data": 3,
      "indexing": 1,
      "performance": 1,
      "mobile": 0
    }
  },
  "issues": [
    {
      "id": "iss_xyz789",
      "url": "https://www.example.com/page",
      "category": "structured_data",
      "type": "missing_required_field",
      "severity": "error",
      "details": {
        "schema_type": "VideoObject",
        "field": "uploadDate",
        "message": "Required field 'uploadDate' is missing from VideoObject schema"
      },
      "auto_fixable": true,
      "suggested_fix": "Add 'uploadDate' field with ISO 8601 date format (e.g., '2025-01-04T00:00:00Z')",
      "detected_at": "2025-01-04T10:00:12Z"
    }
  ]
}
```

**Response (async, >= 10 URLs):**

```json
{
  "validation_id": "val_abc123",
  "status": "processing",
  "site_url": "https://www.example.com",
  "urls_to_check": 100,
  "started_at": "2025-01-04T10:00:00Z",
  "estimated_completion": "2025-01-04T10:05:00Z",
  "callback_url": "https://webhook.example.com/seo-results"
}
```

When processing completes, results are POSTed to `callback_url`.

---

### GET /issues/{site_id}

Get all issues for a registered site.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `site_id` | Domain of the site (e.g., `example.com`) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `fixing`, `fixed`, `wontfix` |
| `category` | string | Filter by category |
| `severity` | string | Filter by severity: `error`, `warning` |
| `limit` | number | Max results (default: 100) |
| `cursor` | string | Pagination cursor |

**Response:**

```json
{
  "site_id": "example.com",
  "total_issues": 25,
  "returned": 25,
  "next_cursor": null,
  "issues": [
    {
      "id": "iss_xyz789",
      "url": "https://www.example.com/page",
      "category": "structured_data",
      "type": "missing_required_field",
      "severity": "error",
      "status": "open",
      "details": { ... },
      "auto_fixable": true,
      "suggested_fix": "...",
      "detected_at": "2025-01-04T10:00:12Z",
      "updated_at": "2025-01-04T10:00:12Z"
    }
  ]
}
```

---

### PATCH /issues/{issue_id}

Update an issue's status.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| `issue_id` | Issue ID (e.g., `iss_xyz789`) |

**Request:**

```json
{
  "status": "fixed"
}
```

**Response:**

```json
{
  "id": "iss_xyz789",
  "status": "fixed",
  "updated_at": "2025-01-04T12:00:00Z"
}
```

---

### POST /sites

Register a site for scheduled monitoring.

**Request:**

```json
{
  "site_url": "https://www.example.com",
  "sitemap_url": "https://www.example.com/sitemap.xml",
  "gsc_property": "sc-domain:example.com",
  "check_schedule": "daily",
  "notification_webhook": "https://webhook.example.com/seo-alerts",
  "notification_email": "alerts@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `site_url` | string | Yes | Base URL of site |
| `sitemap_url` | string | No | Sitemap URL |
| `gsc_property` | string | No | GSC property for API access |
| `check_schedule` | string | No | `daily`, `weekly`, or `manual` (default: `daily`) |
| `notification_webhook` | string | No | Webhook for new issue alerts |
| `notification_email` | string | No | Email for new issue alerts |

**Response:**

```json
{
  "site_id": "example.com",
  "site_url": "https://www.example.com",
  "check_schedule": "daily",
  "next_check": "2025-01-05T00:00:00Z",
  "created_at": "2025-01-04T10:00:00Z"
}
```

---

### GET /sites

List all registered sites.

**Response:**

```json
{
  "sites": [
    {
      "site_id": "example.com",
      "site_url": "https://www.example.com",
      "check_schedule": "daily",
      "last_check": "2025-01-04T00:00:00Z",
      "next_check": "2025-01-05T00:00:00Z",
      "open_issues": 5
    }
  ]
}
```

---

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "implementation": "cloudflare-typescript"
}
```

---

## Issue Types

### Structured Data (`structured_data.*`)

| Type | Severity | Auto-Fixable | Description |
|------|----------|--------------|-------------|
| `missing_required_field` | error | Yes | Required schema.org field is missing |
| `missing_recommended_field` | warning | Yes | Recommended field is missing |
| `invalid_field_value` | error | Sometimes | Field value doesn't match expected format |
| `invalid_field_type` | error | Yes | Field type is wrong (e.g., string instead of array) |
| `missing_schema` | error | Sometimes | Expected schema not found on page |
| `syntax_error` | error | Yes | JSON-LD syntax error |
| `duplicate_schema` | warning | Sometimes | Same schema type appears multiple times |

### Indexing (`indexing.*`)

| Type | Severity | Auto-Fixable | Description |
|------|----------|--------------|-------------|
| `duplicate_without_canonical` | error | Yes | Duplicate content without canonical tag |
| `conflicting_canonical` | error | Yes | Canonical doesn't match URL |
| `crawled_not_indexed` | warning | No | Google crawled but didn't index |
| `discovered_not_indexed` | warning | No | Google found but hasn't crawled |
| `blocked_by_robots` | error | Yes | robots.txt blocking crawl |
| `noindex_tag` | warning | Sometimes | noindex meta tag present |
| `not_found_404` | error | Sometimes | Page returns 404 |
| `server_error_5xx` | error | No | Page returns server error |
| `redirect_chain` | warning | Yes | Multiple redirects |
| `redirect_loop` | error | Yes | Redirect loop detected |

### Performance (`performance.*`)

| Type | Severity | Auto-Fixable | Description |
|------|----------|--------------|-------------|
| `poor_lcp` | error | Sometimes | LCP > 4s |
| `needs_improvement_lcp` | warning | Sometimes | LCP 2.5-4s |
| `poor_inp` | error | Sometimes | INP > 500ms |
| `needs_improvement_inp` | warning | Sometimes | INP 200-500ms |
| `poor_cls` | error | Sometimes | CLS > 0.25 |
| `needs_improvement_cls` | warning | Sometimes | CLS 0.1-0.25 |

### Mobile (`mobile.*`)

| Type | Severity | Auto-Fixable | Description |
|------|----------|--------------|-------------|
| `no_viewport` | error | Yes | Viewport meta tag missing |
| `text_too_small` | warning | Sometimes | Font size < 12px |
| `tap_targets_too_close` | warning | Sometimes | Touch targets < 48px apart |
| `content_wider_than_screen` | error | Sometimes | Horizontal scroll required |

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid site_url format",
    "details": {
      "field": "site_url",
      "reason": "Must be a valid HTTPS URL"
    }
  }
}
```

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
