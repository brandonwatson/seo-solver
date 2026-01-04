# SEO Solver

A polyglot, open-source SEO validation service that detects and helps fix Google Search Console issues. Choose your preferred platform and language.

## What It Does

1. **Validates your site** for SEO issues (structured data, indexing, Core Web Vitals, mobile usability)
2. **Stores issues** in a database for tracking
3. **Suggests fixes** with auto-fix indicators
4. **Integrates with Claude Code** via the `/gsc-solver` skill for AI-assisted fixes

## Choose Your Implementation

| Implementation | Platform | Language | Database | Complexity | Best For |
|---------------|----------|----------|----------|------------|----------|
| [cloudflare-typescript](./implementations/cloudflare-typescript/) | Cloudflare Workers | TypeScript | D1 (SQL) | Simple | Indie devs, quick setup |
| [aws-typescript](./implementations/aws-typescript/) | AWS Lambda | TypeScript | DynamoDB | Medium | Node.js teams |
| [aws-python](./implementations/aws-python/) | AWS Lambda | Python | DynamoDB | Medium | Data/ML teams |
| [aws-go](./implementations/aws-go/) | AWS Lambda | Go | DynamoDB | Medium | DevOps, performance |
| [aws-rust](./implementations/aws-rust/) | AWS Lambda | Rust | DynamoDB | Advanced | Maximum performance |

All implementations expose the **same API** and produce **identical responses**.

## Quick Start

### Cloudflare (Simplest)

```bash
cd implementations/cloudflare-typescript
npm install
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml with your account details
npm run dev        # Local development
npm run deploy     # Deploy to Cloudflare
```

### AWS (Any Language)

```bash
cd implementations/aws-python  # or aws-typescript, aws-go, aws-rust
sam build
sam deploy --guided
```

## API Endpoints

All implementations expose these endpoints:

```
POST /validate
  - Validate a site for SEO issues
  - Body: { site_url, checks[], max_urls?, callback_url? }

GET /issues/{site_id}
  - Get all open issues for a site

POST /sites
  - Register a site for scheduled monitoring

GET /health
  - Health check endpoint
```

See [API Contract](./docs/api-contract.md) for full specification.

## Issue Categories

The validator checks for:

### Structured Data
- Missing required fields (VideoObject, Product, FAQ, etc.)
- Invalid field values
- Schema syntax errors

### Indexing/Coverage
- Duplicate without canonical
- Crawled but not indexed
- Blocked by robots.txt
- 404 errors

### Core Web Vitals
- Poor LCP (Largest Contentful Paint)
- Poor INP (Interaction to Next Paint)
- Poor CLS (Cumulative Layout Shift)

### Mobile Usability
- Viewport not configured
- Text too small
- Tap targets too close

See [Issue Knowledge Base](./docs/issue-knowledge-base.md) for fix strategies.

## Claude Code Integration

Install the `/gsc-solver` skill to get AI-assisted fixes:

```bash
cp -r skill/gsc-solver ~/.claude/skills/
```

Then run `/gsc-solver` in any project to:
1. Detect SEO issues via the API
2. Analyze your codebase for fix locations
3. Auto-fix simple issues or generate workplans for complex ones

## Project Structure

```
seo-solver/
├── docs/                           # Documentation
│   ├── api-contract.md             # API specification
│   ├── issue-knowledge-base.md     # Issue types & fix strategies
│   └── setup/                      # Per-platform setup guides
├── shared/                         # Platform-agnostic resources
│   ├── api-spec.yaml               # OpenAPI spec
│   ├── test-fixtures/              # Shared test data
│   └── schemas/                    # JSON validation schemas
├── implementations/                # Pick one!
│   ├── cloudflare-typescript/
│   ├── aws-typescript/
│   ├── aws-python/
│   ├── aws-go/
│   └── aws-rust/
├── skill/                          # Claude Code skill
│   └── gsc-solver/
└── workplan.md                     # Development roadmap
```

## Contributing

Contributions welcome! You can:
- Improve an existing implementation
- Add a new implementation (Vercel, Deno, etc.)
- Expand the issue knowledge base
- Add new validators

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE)
