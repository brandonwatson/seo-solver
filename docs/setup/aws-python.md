# AWS Lambda (Python) Setup Guide

This guide walks through deploying the Python/AWS Lambda implementation.

## Prerequisites

- [Python](https://python.org/) 3.11+
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS account with Lambda, DynamoDB, API Gateway permissions

## Quick Start

```bash
cd implementations/aws-python
pip install -r requirements.txt  # For local development
sam build
sam deploy --guided
```

## Project Structure

```
aws-python/
├── template.yaml          # SAM template
├── samconfig.toml         # Deployment config
├── requirements.txt       # Python dependencies
├── src/
│   ├── handlers/          # Lambda handlers
│   │   ├── validate.py
│   │   ├── issues.py
│   │   └── sites.py
│   ├── validators/        # Validation logic
│   │   ├── structured_data.py
│   │   ├── indexing.py
│   │   └── performance.py
│   └── db/
│       └── dynamodb.py    # Database access
└── tests/
    └── ...
```

## Key Dependencies

```
requests>=2.31.0        # HTTP client
beautifulsoup4>=4.12.0  # HTML parsing
boto3>=1.34.0           # AWS SDK
pydantic>=2.5.0         # Data validation
```

## Local Development

### Run Locally

```bash
sam local start-api
```

### Run Tests

```bash
pytest tests/ -v
```

### Invoke Function

```bash
sam local invoke ValidateFunction \
  --event events/validate.json
```

## Deploy

```bash
sam build && sam deploy
```

## Environment Variables

Same as TypeScript implementation - see [aws-typescript.md](./aws-typescript.md).

## Verify

```bash
curl $API_URL/health
# {"status": "healthy", "implementation": "aws-python"}
```

## Python-Specific Notes

### Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Type Hints

All code uses type hints for clarity:

```python
def validate_structured_data(url: str) -> list[Issue]:
    ...
```

### Pydantic Models

Request/response validation:

```python
class ValidateRequest(BaseModel):
    site_url: HttpUrl
    checks: list[str] = ["structured_data", "indexing"]
    max_urls: int = Field(default=50, le=500)
```
