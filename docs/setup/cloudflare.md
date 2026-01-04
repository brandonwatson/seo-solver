# Cloudflare Workers Setup Guide

This guide walks through deploying the TypeScript/Cloudflare implementation.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Quick Start

```bash
cd implementations/cloudflare-typescript
npm install
cp wrangler.toml.example wrangler.toml
```

## Configuration

Edit `wrangler.toml`:

```toml
name = "seo-solver"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_KEY = "your-api-key-here"

[[d1_databases]]
binding = "DB"
database_name = "seo-solver"
database_id = "your-database-id"  # Created in step below

[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC
```

## Create D1 Database

```bash
# Create the database
wrangler d1 create seo-solver

# Note the database_id from output, add to wrangler.toml

# Apply schema
wrangler d1 execute seo-solver --file=schema.sql
```

## Secrets

For sensitive values, use secrets instead of vars:

```bash
# PageSpeed Insights API key (optional, for performance checks)
wrangler secret put PAGESPEED_API_KEY

# GSC Service Account (optional, for indexing checks)
wrangler secret put GSC_SERVICE_ACCOUNT
```

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

Test the health endpoint:

```bash
curl http://localhost:8787/health
```

## Deploy

```bash
npm run deploy
```

Your API will be available at:
`https://seo-solver.{your-subdomain}.workers.dev`

## Verify Deployment

```bash
# Health check
curl https://seo-solver.your-subdomain.workers.dev/health

# Run validation (with API key)
curl -X POST https://seo-solver.your-subdomain.workers.dev/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"site_url": "https://example.com", "max_urls": 5}'
```

## Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Workers → your worker
2. Click "Triggers" tab
3. Add custom domain (must be on Cloudflare)

## Monitoring

- **Logs:** `wrangler tail` for real-time logs
- **Analytics:** Cloudflare Dashboard → Workers → Analytics

## Costs

**Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- 1GB D1 storage

**Paid ($5/month):**
- 10 million requests/month included
- 30s CPU time per request
- 10GB D1 storage per database

For most SEO monitoring use cases, the free tier is sufficient.
