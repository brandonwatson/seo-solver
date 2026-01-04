# SEO Solver - Ideation Document

## Overview

SEO Solver is an open-source, polyglot SEO validation service that detects Google Search Console issues programmatically and integrates with AI coding assistants to fix them. Users deploy their preferred implementation (Cloudflare/TypeScript, AWS/Python, AWS/Go, AWS/Rust) and get a consistent API for monitoring SEO health across all their projects.

**Tagline concept**: *Detect, track, and fix SEO issues before Google emails you about them.*

## Problem Statement

Developers and indie hackers increasingly manage multiple web properties. Google Search Console reports issues via email, but:

1. **Reactive, not proactive** — You learn about issues after Google has already noticed them, potentially affecting rankings
2. **No programmatic access** — GSC API provides limited data; Enhancement reports (structured data errors) aren't available via API
3. **Manual fix process** — Even when you know about an issue, finding the right file and implementing the fix requires manual investigation
4. **No cross-project view** — If you manage multiple sites, checking each GSC property is tedious
5. **Platform lock-in** — Most SEO tools are SaaS products with monthly fees; no open-source alternative exists

## Solution

A multi-implementation SEO validation service that:

1. Self-validates your sites (structured data, indexing, Core Web Vitals, mobile usability)
2. Stores issues in a database for tracking across time
3. Exposes a consistent API that works with any backend implementation
4. Integrates with Claude Code via a skill that can auto-fix issues
5. Runs on a schedule to catch issues before they impact rankings

### Key Differentiators

| Existing Tools | SEO Solver |
|----------------|------------|
| SaaS with monthly fees | Open-source, self-hosted |
| Single implementation | Choose your language/platform |
| Detect only | Detect + AI-assisted fix |
| Per-site dashboards | Cross-project API |
| Generic fix suggestions | Codebase-aware auto-fixes |

## Target Users

**Primary**: Indie developers who:
- Manage multiple web properties (personal projects, side businesses)
- Use Claude Code or similar AI coding assistants
- Prefer self-hosted, open-source solutions
- Want to learn new languages (Go, Rust) while solving real problems

**Secondary**:
- Small agencies managing client sites
- DevOps teams wanting SEO in their monitoring stack
- Developers who want to contribute to open-source

## Core User Flow

### 1. Choose Implementation

User selects based on their stack preference:
- **Cloudflare/TypeScript**: Simplest setup, great for indie devs
- **AWS/TypeScript**: Familiar Node.js environment
- **AWS/Python**: Data team favorite, easy to extend
- **AWS/Go**: Performance-focused, DevOps teams
- **AWS/Rust**: Maximum performance, learning opportunity

### 2. Deploy

```bash
# Cloudflare example
cd implementations/cloudflare-typescript
npm install && npm run deploy

# AWS example
cd implementations/aws-python
sam build && sam deploy --guided
```

### 3. Register Sites

```bash
curl -X POST https://your-api/sites \
  -H "X-API-Key: your-key" \
  -d '{"site_url": "https://example.com", "check_schedule": "daily"}'
```

### 4. Automatic Monitoring

- Service validates registered sites on schedule
- New issues stored in database
- Webhook notifications when issues found

### 5. AI-Assisted Fixes

```bash
# In any project directory
/gsc-solver

# Claude Code:
# - Calls your API to get issues
# - Analyzes your codebase
# - Auto-fixes simple issues
# - Generates workplans for complex ones
```

## Output Formats

### 1. API Response

```json
{
  "issues": [
    {
      "url": "https://example.com/page",
      "category": "structured_data",
      "type": "missing_required_field",
      "severity": "error",
      "details": {
        "schema_type": "VideoObject",
        "field": "uploadDate"
      },
      "auto_fixable": true,
      "suggested_fix": "Add uploadDate field with ISO 8601 date"
    }
  ]
}
```

### 2. Claude Code Skill Integration

The `/gsc-solver` skill:
- Fetches issues from your deployed API
- Searches codebase for relevant files
- Applies fixes using Edit tool
- Generates workplans for complex issues

### 3. Webhook Notifications

```json
{
  "event": "new_issues",
  "site": "example.com",
  "count": 3,
  "issues": [...]
}
```

## Technical Architecture

### Stack Options

| Platform | Language | Database | Routing | Scheduled |
|----------|----------|----------|---------|-----------|
| Cloudflare | TypeScript | D1 (SQLite) | Workers | Cron Triggers |
| AWS | TypeScript | DynamoDB | API Gateway | EventBridge |
| AWS | Python | DynamoDB | API Gateway | EventBridge |
| AWS | Go | DynamoDB | API Gateway | EventBridge |
| AWS | Rust | DynamoDB | API Gateway | EventBridge |

### Key Technical Components

1. **Validators**
   - Structured Data: Fetch page, parse JSON-LD, check required fields
   - Indexing: Check canonical, robots.txt, response codes
   - Performance: Call PageSpeed Insights API
   - Mobile: Check viewport, simulate mobile UA

2. **API Layer**
   - POST /validate - Run validation
   - GET /issues/{site} - Query stored issues
   - POST /sites - Register for monitoring
   - Consistent contract across all implementations

3. **Storage**
   - Sites table: Registered sites and schedules
   - Issues table: Detected issues with status tracking
   - Platform-appropriate: D1 (Cloudflare) or DynamoDB (AWS)

4. **Scheduled Validation**
   - Cron/EventBridge triggers daily/weekly
   - Process registered sites
   - Store new issues, clear resolved ones

## Scope Definition

### MVP (v0.1)

**Goal**: Prove the concept with one working implementation.

**In Scope**:
- Cloudflare TypeScript implementation (simplest)
- API contract (OpenAPI spec)
- Core validators:
  - Structured data (JSON-LD parsing)
  - Basic indexing (canonical, robots.txt)
- Manual validation endpoint
- Issue storage and retrieval
- Basic documentation

**Out of Scope for MVP**:
- AWS implementations
- Scheduled validation
- Claude Code skill
- PageSpeed Insights integration
- Webhook notifications

### v1.0

**Adds**:
- All AWS implementations (TypeScript, Python, Go, Rust)
- Scheduled validation
- Claude Code skill with auto-fix
- PageSpeed Insights for Core Web Vitals
- Mobile usability checks
- Webhook notifications
- Comprehensive documentation

### Future Considerations (Post v1.0)

- Additional platform implementations (Vercel, Deno, Bun)
- Direct GSC API integration for URL Inspection
- Playwright integration for GSC UI scraping
- Team/multi-user support
- Dashboard UI (optional)
- Historical trending and reporting

## Business Model

### Open Source Strategy

- **Core service**: MIT licensed, fully open-source
- **No SaaS offering**: Users self-host
- **Revenue**: None directly (portfolio/credibility project)

### Value Proposition

1. **For users**: Free, self-hosted SEO monitoring
2. **For contributors**: Learn new languages while solving real problems
3. **For portfolio**: Demonstrates polyglot architecture skills

### Why Open Source?

- Validates the multi-implementation architecture approach
- Builds community and credibility
- No ongoing maintenance burden of a SaaS
- Learning opportunity for Go and Rust

## Success Metrics

### MVP Success Criteria

1. **Validates real issues**: Detects issues that match GSC reports
2. **Works across implementations**: All implementations produce identical API responses
3. **Self-hostable**: Users can deploy following docs alone
4. **Dog-foodable**: Successfully monitors calminterview.com and guessthelp.com

### v1.0 Success Criteria

1. GitHub stars indicate community interest (target: 100+)
2. External contributions (at least one non-author PR)
3. Claude Code skill successfully fixes issues in real codebases
4. All five implementations pass same test suite
5. Documented performance comparison across implementations

## Risks and Open Questions

### Technical Risks

- **Validation accuracy**: Will self-validation match what Google sees?
- **Rate limits**: PageSpeed and GSC APIs have quotas
- **Cross-implementation consistency**: Can we guarantee identical behavior?
- **Cold starts**: Lambda cold starts may affect scheduled validation

### Product Risks

- **Adoption**: Will developers prefer self-hosting over SaaS convenience?
- **Maintenance**: Five implementations = five things to maintain
- **Scope creep**: Temptation to add more validators/features

### Open Questions

1. How often should scheduled validation run? (Daily seems right)
2. Should we support custom validation rules?
3. How to handle sites with thousands of pages? (Sampling?)
4. What's the right balance of auto-fix confidence?
5. Should the skill work offline (local validation, no API)?

## Competitive Landscape

### No Direct Competitor For:

1. Open-source + self-hosted
2. Polyglot implementations
3. Claude Code integration
4. Designed for indie developers

### Adjacent Tools

| Tool | What it does | Gap |
|------|--------------|-----|
| Screaming Frog | Desktop SEO crawler | Not automated, not open-source |
| Sitebulb | Cloud SEO auditing | SaaS, not self-hosted |
| Ahrefs/SEMrush | Enterprise SEO suites | Expensive, overkill for indie devs |
| Lighthouse CI | Performance monitoring | No structured data, no GSC integration |
| Google Search Console | Official source | No API for Enhancement reports |

## Next Steps

1. **Finalize workplans** — Review and adjust phase scope
2. **Set up repository** — Initialize with proper structure ✓
3. **Implement Phase 1** — API contract and Cloudflare implementation
4. **Validate with real site** — Test against calminterview.com
5. **Iterate** — AWS implementations, skill, polish

---

*Document created: January 2025*
*Status: Ideation*
