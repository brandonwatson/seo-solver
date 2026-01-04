# AWS Lambda (Go) Setup Guide

This guide walks through deploying the Go/AWS Lambda implementation.

## Prerequisites

- [Go](https://go.dev/) 1.21+
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS account with Lambda, DynamoDB, API Gateway permissions

## Quick Start

```bash
cd implementations/aws-go
go mod download
sam build
sam deploy --guided
```

## Project Structure

```
aws-go/
├── template.yaml          # SAM template
├── samconfig.toml         # Deployment config
├── go.mod                 # Go module definition
├── go.sum                 # Dependency checksums
├── cmd/
│   ├── validate/
│   │   └── main.go        # Validate handler
│   ├── issues/
│   │   └── main.go        # Issues handler
│   └── sites/
│       └── main.go        # Sites handler
├── internal/
│   ├── validators/        # Validation logic
│   ├── db/                # DynamoDB access
│   └── models/            # Data structures
└── tests/
    └── ...
```

## Key Dependencies

```go
// go.mod
require (
    github.com/aws/aws-lambda-go v1.46.0
    github.com/aws/aws-sdk-go-v2 v1.24.0
    github.com/aws/aws-sdk-go-v2/service/dynamodb v1.27.0
    github.com/PuerkitoBio/goquery v1.8.1  // HTML parsing
)
```

## Local Development

### Build

```bash
go build -o bootstrap ./cmd/validate
```

### Run Tests

```bash
go test ./... -v
```

### Run Locally with SAM

```bash
sam local start-api
```

## Deploy

```bash
sam build && sam deploy
```

## Go-Specific Notes

### Lambda Handler Pattern

```go
package main

import (
    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Handle request
    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       `{"status": "ok"}`,
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

### Error Handling

Go's explicit error handling:

```go
result, err := validateURL(url)
if err != nil {
    return nil, fmt.Errorf("validation failed: %w", err)
}
```

### Concurrency with Goroutines

```go
// Validate multiple URLs concurrently
var wg sync.WaitGroup
results := make(chan Issue, len(urls))

for _, url := range urls {
    wg.Add(1)
    go func(u string) {
        defer wg.Done()
        issues := validate(u)
        for _, issue := range issues {
            results <- issue
        }
    }(url)
}
```

## Performance

Go's compiled nature provides:
- Fast cold starts (~100ms vs ~500ms for Python)
- Low memory usage
- Efficient concurrency
