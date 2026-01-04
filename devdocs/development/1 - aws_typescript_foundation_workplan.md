# Workplan 1: AWS TypeScript Foundation

## Overview

**Problem:** Google Search Console reports SEO issues via email, but there's no programmatic way to detect, track, and fix these issues across multiple projects. The GSC API provides limited data, and manually checking each site is tedious.

**Solution:** Build an open-source SEO validation service that:
- Detects SEO issues (structured data, indexing, performance, mobile) by self-validating pages
- Exposes a consistent API that any project can call
- Stores issues in DynamoDB for tracking
- Suggests fixes with auto-fix indicators

**Constraints:**
- Must be truly open-source (MIT license, no proprietary dependencies)
- First implementation on AWS Lambda/TypeScript (familiar platform)
- API contract must be stable - all future implementations conform to it
- SAM templates follow AWS best practices

---

## Implementation Strategy

**Approach:** Establish the API contract and shared resources first, then implement AWS Lambda TypeScript as the reference implementation. This sets the pattern for all subsequent implementations.

**Key Decisions:**
- AWS Lambda + API Gateway for serverless deployment
- DynamoDB for database (NoSQL, scales automatically)
- TypeScript for type safety and familiarity
- OpenAPI spec as the source of truth for API contract
- Validators are pure functions - Lambda handlers wrap them
- Stage-aware resource naming: `SEO-Sites-${StageName}`, `SEO-Issues-${StageName}`

**Dependencies:**
- AWS account with Lambda, DynamoDB, API Gateway permissions
- SAM CLI installed
- Node.js 18+ for local development
- Optional: PageSpeed Insights API key, GSC service account

---

## Phase 1: API Contract & Shared Resources

- **STATUS:** PENDING
- **Goal:** Create machine-readable OpenAPI spec and shared test resources
- **Estimated Effort:** Small (1-2 sessions)
- **Notes:**
    - `docs/api-contract.md` already exists as human-readable reference
    - This phase creates the machine-readable version for tooling/validation
    - JSON schemas enable runtime validation and cross-implementation testing

### Current State:

```
shared/
├── schemas/.gitkeep      # Placeholder exists
└── test-fixtures/.gitkeep # Placeholder exists

docs/
└── api-contract.md       # Human-readable spec exists
```

### Target State:

```
shared/
├── api-spec.yaml                    # OpenAPI 3.0 spec
├── schemas/
│   ├── issue.json                   # Issue object schema
│   ├── site.json                    # Site registration schema
│   ├── validation-request.json      # POST /validate request
│   └── validation-response.json     # POST /validate response
└── test-fixtures/
    ├── requests/                    # Sample API requests
    │   ├── validate-basic.json
    │   ├── validate-all-checks.json
    │   └── site-register.json
    ├── responses/                   # Expected responses
    │   ├── validation-success.json
    │   ├── validation-with-issues.json
    │   └── error-invalid-url.json
    └── html/                        # Test HTML pages
        ├── valid-structured-data.html
        ├── missing-jsonld.html
        ├── invalid-schema-field.html
        └── missing-viewport.html
```

### Tasks:

- **1.1. Create OpenAPI Specification:**
    - File: `shared/api-spec.yaml`
    - Convert `docs/api-contract.md` to OpenAPI 3.0 format
    - Include all endpoints, request/response schemas, error formats
    - Document X-API-Key authentication

- **1.2. Create JSON Schemas:**
    - Files: `shared/schemas/*.json`
    - Extract schemas from OpenAPI spec as standalone JSON Schema draft-07 files
    - Include all enums (issue types, categories, severities)

- **1.3. Create Test Fixtures - Requests:**
    - Files: `shared/test-fixtures/requests/*.json`
    - Sample valid requests for each endpoint
    - Include edge cases (max_urls, specific checks only)

- **1.4. Create Test Fixtures - Responses:**
    - Files: `shared/test-fixtures/responses/*.json`
    - Success responses with various issue combinations
    - Error responses for each error type

- **1.5. Create Test Fixtures - HTML Pages:**
    - Files: `shared/test-fixtures/html/*.html`
    - Pages with valid structured data (all schema types)
    - Pages with each type of issue (missing fields, invalid values, no schema)
    - Pages with mobile issues (no viewport, etc.)

- **1.6. Verify:**
    - Run: `npx @apidevtools/swagger-cli validate shared/api-spec.yaml`
    - Run: `npx ajv-cli compile -s shared/schemas/*.json`
    - Confirm test fixtures cover all 20+ issue types from `docs/issue-knowledge-base.md`

---

## Phase 2: AWS TypeScript Implementation

- **STATUS:** PENDING
- **Goal:** Create the reference implementation on AWS Lambda with DynamoDB
- **Estimated Effort:** Medium (3-5 sessions)
- **Notes:**
    - This sets patterns for all other implementations
    - Keep validators as pure functions in `src/validators/`
    - Lambda handlers in `src/handlers/` wrap validators
    - Use `${StageName}` in all resource names for multi-environment support
    - IAM: Include `/index/*` ARN for GSI access

### Current State:

```
implementations/aws-typescript/
├── template.yaml      # Basic scaffold exists
├── package.json       # Dependencies defined
├── tsconfig.json      # TypeScript config exists
└── samconfig.toml     # Deployment config exists
```

### Target State:

```
implementations/aws-typescript/
├── template.yaml              # Full SAM template
├── package.json
├── tsconfig.json
├── samconfig.toml
├── src/
│   ├── handlers/
│   │   ├── validate.ts        # POST /validate
│   │   ├── issues.ts          # GET /issues/{site_id}
│   │   ├── sites.ts           # POST /sites, GET /sites
│   │   └── health.ts          # GET /health
│   ├── validators/
│   │   ├── index.ts           # Validator orchestration
│   │   ├── structured-data.ts # JSON-LD validation
│   │   ├── indexing.ts        # Canonical, robots.txt
│   │   ├── performance.ts     # PageSpeed API
│   │   └── mobile.ts          # Viewport, UA checks
│   ├── db/
│   │   └── dynamodb.ts        # DynamoDB access layer
│   └── types/
│       └── index.ts           # Shared TypeScript types
└── tests/
    └── ...
```

### Tasks:

- **2.1. SAM Template - Resources:**
    - File: `implementations/aws-typescript/template.yaml`
    - Define HTTP API Gateway with CORS
    - Define 4 Lambda functions (validate, issues, sites, health)
    - Define 2 DynamoDB tables with GSIs
    - Define EventBridge rule for scheduled validation (disabled by default)

- **2.2. SAM Template - IAM & Config:**
    - Add IAM policies with least privilege (DynamoDB CRUD, SSM read)
    - Include GSI ARN pattern: `${Table.Arn}/index/*`
    - Add SSM parameter references for API keys
    - Create `samconfig.toml.example` with placeholder values

- **2.3. DynamoDB Access Layer:**
    - File: `implementations/aws-typescript/src/db/dynamodb.ts`
    - Implement: `getSite()`, `putSite()`, `listSites()`
    - Implement: `getIssues()`, `putIssue()`, `updateIssueStatus()`
    - Use DocumentClient with proper typing

- **2.4. Validator - Structured Data:**
    - File: `implementations/aws-typescript/src/validators/structured-data.ts`
    - Fetch page HTML, parse JSON-LD scripts
    - Check required fields per schema type (see `docs/issue-knowledge-base.md`)
    - Return array of issues with details

- **2.5. Validator - Indexing:**
    - File: `implementations/aws-typescript/src/validators/indexing.ts`
    - Check canonical tag presence and validity
    - Check robots.txt accessibility
    - Check HTTP response codes
    - Check meta robots tags

- **2.6. Validator - Performance:**
    - File: `implementations/aws-typescript/src/validators/performance.ts`
    - Call PageSpeed Insights API (if API key configured)
    - Extract LCP, INP, CLS scores
    - Return issues for scores below thresholds

- **2.7. Validator - Mobile:**
    - File: `implementations/aws-typescript/src/validators/mobile.ts`
    - Check viewport meta tag
    - Simulate mobile user agent request
    - Check for mobile-specific issues

- **2.8. API Handlers:**
    - Files: `implementations/aws-typescript/src/handlers/*.ts`
    - POST /validate: Orchestrate validators, store issues, return response
    - GET /issues/{site_id}: Query DynamoDB, filter by status
    - POST /sites: Register site, validate URL format
    - GET /health: Return status, version, implementation name

- **2.9. Scheduled Validation:**
    - Add EventBridge rule in template.yaml (cron daily)
    - Create handler that queries sites due for check
    - Invoke validation for each site

- **2.10. Verify:**
    - Run: `sam build && sam local start-api`
    - Test all endpoints against test fixtures
    - Deploy to dev: `sam deploy`
    - Validate calminterview.com with POST /validate

---

## Phase 3: Documentation & Polish

- **STATUS:** PENDING
- **Goal:** Make the AWS TypeScript implementation ready for external users
- **Estimated Effort:** Small (1-2 sessions)
- **Notes:**
    - `docs/setup/aws-typescript.md` already exists - enhance it
    - Focus on troubleshooting common issues
    - CI should run tests on every PR

### Current State:

```
docs/setup/aws-typescript.md  # Basic setup guide exists
```

### Tasks:

- **3.1. Enhance Setup Documentation:**
    - File: `docs/setup/aws-typescript.md`
    - Add troubleshooting section (credentials, timeouts, permissions)
    - Add SSM parameter setup commands
    - Add local development workflow

- **3.2. Create samconfig.toml.example:**
    - File: `implementations/aws-typescript/samconfig.toml.example`
    - Include all parameters with placeholder values
    - Document each parameter with comments

- **3.3. Create CI Workflow:**
    - File: `.github/workflows/test-aws-typescript.yml`
    - Run lint, typecheck, unit tests
    - Run integration tests against test fixtures
    - Trigger on PRs to main

- **3.4. Create CONTRIBUTING.md:**
    - File: `CONTRIBUTING.md`
    - Development setup instructions
    - Code style guidelines
    - PR process

- **3.5. Verify:**
    - Fresh clone + `npm install` + `sam build` works
    - `sam local invoke` works with test fixtures
    - CI workflow passes

---

## Expected Results

After completing this workplan:
- OpenAPI spec at `shared/api-spec.yaml` validates with tooling
- JSON schemas at `shared/schemas/` usable for runtime validation
- Test fixtures at `shared/test-fixtures/` cover all issue types
- AWS TypeScript implementation fully functional
- calminterview.com validated successfully
- Documentation sufficient for external contributors
- CI runs tests automatically

---

## Risks & Unknowns

- **Risk:** PageSpeed API rate limits (25k/day free tier) - may need caching
- **Risk:** GSC URL Inspection API requires GCP service account setup - document clearly
- **Unknown:** How to handle sites with thousands of pages - implement sampling with `max_urls` parameter
- **Unknown:** Cold start latency for Lambda validators - may need provisioned concurrency for production

---

## TRACKING SUMMARY

### Phase 1 Completed Features

- OpenAPI 3.0 spec at `shared/api-spec.yaml`
- JSON schemas for all entities (`shared/schemas/*.json`)
- Test fixtures for requests, responses, and HTML pages
- Validated with redocly and ajv-cli

### Phase 2 Completed Features

- Full SAM template with Node.js 22.x on arm64
- 5 Lambda handlers: health, validate, sites, issues, scheduled
- DynamoDB tables with GSIs (seo-solver-sites-dev, seo-solver-issues-dev)
- 4 validator modules: structured-data, indexing, performance, mobile
- Deploy scripts (sam-deploy-sample.sh, sso-login-sample.sh)
- Deployed to: https://q28wfj5xpc.execute-api.us-west-1.amazonaws.com/dev
- Bug fix: PATCH endpoint path matching for stage prefix

### Phase 3 Completed Features

- TBD (deferred - pivoting to GSC integration)

### Additional Implementations Beyond Original Tasks

- .nvmrc for Node.js 22 version pinning
- Redirect chain detection in indexing validator

### Deferred/Not Implemented Items

- Phase 3 documentation polish - deferred pending GSC integration
- CI workflow - will be added after architecture stabilizes

### Technical Notes and Learnings

- **PIVOT:** Validators are now SECONDARY to Google Search Console API integration
- See Workplan 2 for GSC integration as primary data source
- Validators remain useful for:
  - Sites without GSC connected (e.g., askmylisting.com)
  - Proactive detection before Google catches issues
  - Reference implementation for custom validators
- SAM `rawPath` includes stage prefix (e.g., `/dev/issues/`) - use `includes()` not `startsWith()`
- SAM CLI 1.151.0+ required for Node.js 22.x support

### Key Files Modified

- `shared/api-spec.yaml` - OpenAPI specification
- `shared/schemas/*.json` - JSON Schema definitions
- `implementations/aws-typescript/template.yaml` - SAM infrastructure
- `implementations/aws-typescript/src/handlers/*.ts` - Lambda handlers
- `implementations/aws-typescript/src/validators/*.ts` - SEO validators (now secondary)
- `implementations/aws-typescript/src/db/dynamodb.ts` - Database layer
- `.nvmrc` - Node.js version
- `scripts/*-sample.sh` - Deploy script templates
