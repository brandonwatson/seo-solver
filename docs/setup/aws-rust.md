# AWS Lambda (Rust) Setup Guide

This guide walks through deploying the Rust/AWS Lambda implementation.

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [cargo-lambda](https://www.cargo-lambda.info/) for Lambda builds
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS account with Lambda, DynamoDB, API Gateway permissions

## Install cargo-lambda

```bash
# Via pip
pip install cargo-lambda

# Or via cargo
cargo install cargo-lambda
```

## Quick Start

```bash
cd implementations/aws-rust
cargo lambda build --release
sam deploy --guided
```

## Project Structure

```
aws-rust/
├── template.yaml          # SAM template
├── samconfig.toml         # Deployment config
├── Cargo.toml             # Rust package manifest
├── Cargo.lock             # Dependency lock file
├── src/
│   ├── main.rs            # Entry point
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── validate.rs
│   │   ├── issues.rs
│   │   └── sites.rs
│   ├── validators/
│   │   ├── mod.rs
│   │   ├── structured_data.rs
│   │   └── indexing.rs
│   └── db/
│       └── dynamodb.rs
└── tests/
    └── ...
```

## Key Dependencies

```toml
# Cargo.toml
[dependencies]
lambda_runtime = "0.8"
aws-sdk-dynamodb = "1.0"
aws-config = "1.0"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json"] }
scraper = "0.18"  # HTML parsing
```

## Local Development

### Build

```bash
cargo build
```

### Run Tests

```bash
cargo test
```

### Run Locally

```bash
cargo lambda watch
```

This starts a local Lambda emulator at `http://localhost:9000`.

### Invoke Locally

```bash
cargo lambda invoke validate \
  --data-file events/validate.json
```

## Deploy

### Build for Lambda

```bash
cargo lambda build --release --arm64
```

### Deploy with SAM

```bash
sam deploy
```

## Rust-Specific Notes

### Lambda Handler Pattern

```rust
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Request {
    site_url: String,
}

#[derive(Serialize)]
struct Response {
    issues: Vec<Issue>,
}

async fn handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let (request, _context) = event.into_parts();
    let issues = validate(&request.site_url).await?;
    Ok(Response { issues })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}
```

### Error Handling with Result

```rust
fn validate_url(url: &str) -> Result<Vec<Issue>, ValidationError> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| ValidationError::FetchFailed(e))?;

    let html = response.text()
        .await
        .map_err(|e| ValidationError::ParseFailed(e))?;

    parse_structured_data(&html)
}
```

### Async/Await with Tokio

```rust
// Validate multiple URLs concurrently
let futures: Vec<_> = urls
    .iter()
    .map(|url| validate_url(url))
    .collect();

let results = futures::future::join_all(futures).await;
```

### Memory Safety

Rust's ownership system prevents:
- Null pointer dereferences
- Buffer overflows
- Data races

No garbage collector = consistent performance.

## Performance

Rust provides:
- **Fastest cold starts** (~50ms)
- **Lowest memory usage**
- **Near-native performance**
- **Smallest binary size**

Ideal for high-volume, performance-critical workloads.

## Learning Resources

- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [AWS Lambda Rust Runtime](https://github.com/awslabs/aws-lambda-rust-runtime)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
