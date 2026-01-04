# AWS Lambda (TypeScript) Setup Guide

This guide walks through deploying the TypeScript/AWS Lambda implementation.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS account with permissions for Lambda, DynamoDB, API Gateway, IAM

## Quick Start

```bash
cd implementations/aws-typescript
npm install
sam build
sam deploy --guided
```

## Configuration

### First-Time Deployment

`sam deploy --guided` will prompt for:

- **Stack Name**: e.g., `seo-solver-dev`
- **AWS Region**: e.g., `us-west-2`
- **Parameter ApiKey**: Your API key for authentication
- **Confirm changes**: Review and confirm

### Subsequent Deployments

```bash
sam build && sam deploy
```

Configuration is saved in `samconfig.toml`.

## Environment Variables

Set in `template.yaml` or via SAM parameters:

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Authentication key | Yes |
| `PAGESPEED_API_KEY` | PageSpeed Insights API | No |
| `GSC_SERVICE_ACCOUNT` | GSC API credentials | No |

### Secrets via SSM Parameter Store

For production, store secrets in SSM:

```bash
# Store API key
aws ssm put-parameter \
  --name "/seo-solver/prod/api-key" \
  --value "your-secret-key" \
  --type "SecureString"

# Store PageSpeed API key
aws ssm put-parameter \
  --name "/seo-solver/prod/pagespeed-api-key" \
  --value "your-pagespeed-key" \
  --type "SecureString"
```

Reference in template.yaml:
```yaml
Environment:
  Variables:
    API_KEY: !Sub '{{resolve:ssm:/seo-solver/${Stage}/api-key}}'
```

## DynamoDB Tables

SAM creates these tables automatically:

### SEO-Sites-{stage}

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | `SITE#{domain}` |
| site_url | String | Full site URL |
| check_schedule | String | `daily`, `weekly`, `manual` |
| last_check | String | ISO timestamp |

### SEO-Issues-{stage}

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | `SITE#{domain}` |
| SK | String | `ISSUE#{url_hash}#{type}` |
| url | String | Page URL |
| category | String | Issue category |
| type | String | Issue type |
| status | String | `open`, `fixed`, etc. |

## Local Development

### Run Locally with SAM

```bash
sam local start-api
```

API available at `http://localhost:3000`.

### Run Tests

```bash
npm test
```

### Invoke Function Directly

```bash
sam local invoke ValidateFunction \
  --event events/validate.json
```

## Deploy to Production

### Create Production Config

```bash
# samconfig.toml
[prod]
[prod.deploy]
[prod.deploy.parameters]
stack_name = "seo-solver-prod"
region = "us-west-2"
parameter_overrides = "Stage=prod"
```

### Deploy

```bash
sam deploy --config-env prod
```

## Verify Deployment

```bash
# Get API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name seo-solver-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Health check
curl $API_URL/health

# Run validation
curl -X POST $API_URL/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"site_url": "https://example.com", "max_urls": 5}'
```

## Scheduled Validation

EventBridge rule runs daily at midnight UTC by default.

### Change Schedule

In `template.yaml`:

```yaml
ScheduledValidationRule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: "rate(1 day)"  # or "cron(0 0 * * ? *)"
```

### Disable Scheduled Validation

Set the rule to `DISABLED`:

```yaml
State: DISABLED
```

## Monitoring

### CloudWatch Logs

```bash
# Stream logs
sam logs -n ValidateFunction --stack-name seo-solver-dev --tail
```

### CloudWatch Metrics

- Lambda invocations, errors, duration
- API Gateway requests, latency
- DynamoDB read/write capacity

## Costs

**Estimated monthly cost for light usage:**

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| Lambda | 1M requests | $0.20/1M |
| API Gateway | 1M requests | $1.00/1M |
| DynamoDB | 25GB, 25 WCU/RCU | Pay per use |

For typical SEO monitoring (few sites, daily checks): **< $1/month**

## Troubleshooting

### "Missing credentials" error

```bash
aws configure
# Or set AWS_PROFILE
export AWS_PROFILE=your-profile
```

### "Stack already exists" error

Use a different stack name or delete the existing stack:

```bash
sam delete --stack-name seo-solver-dev
```

### Lambda timeout

Increase timeout in `template.yaml`:

```yaml
Globals:
  Function:
    Timeout: 30  # seconds
```
