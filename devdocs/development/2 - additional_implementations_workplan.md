# Workplan 2: Additional Implementations (Python, Go, Rust, Cloudflare)

## Overview

**Problem:** The AWS TypeScript implementation serves as the foundation, but the project's value is in supporting multiple platforms and languages. Additionally, this project serves as a learning vehicle for Go and Rust.

**Solution:** Create additional implementations that conform to the same API contract:
- AWS Python (popular for data teams)
- AWS Go (performance-focused, DevOps favorite, learning opportunity)
- AWS Rust (maximum performance, learning opportunity)
- Cloudflare TypeScript (simpler for indie devs, different platform)

**Constraints:**
- All implementations must pass the same test suite from `shared/test-fixtures/`
- All implementations must produce identical API responses (byte-identical JSON, excluding timestamps/UUIDs)
- Each implementation is independently deployable
- Learning is an explicit goal for Go and Rust

---

## Implementation Strategy

**Approach:** Use the AWS TypeScript implementation as reference for all ports. Start with Python (familiar), then Go and Rust (learning), finally Cloudflare (different platform).

**Key Decisions:**
- SAM for all AWS implementations
- Wrangler for Cloudflare
- Each implementation in its own directory under `implementations/`
- Same DynamoDB schema for AWS; D1 (SQLite) for Cloudflare
- All validators follow same interface: `validate(url) → Issue[]`

**Dependencies:**
- AWS TypeScript implementation complete (Workplan 1)
- Shared test fixtures at `shared/test-fixtures/`
- Language-specific toolchains installed
- Cloudflare account for that implementation

**Learning Resources (read before Go/Rust phases):**
- Go: [The Go Programming Language](https://golang.org/doc/), [Go by Example](https://gobyexample.com/)
- Rust: [The Rust Book](https://doc.rust-lang.org/book/), [Rust by Example](https://doc.rust-lang.org/rust-by-example/)

---

## Current State (All Implementations)

Scaffold files already exist - no implementation code yet:

```
implementations/
├── aws-python/
│   ├── template.yaml       # Basic SAM template
│   └── requirements.txt    # Dependencies defined
├── aws-go/
│   ├── template.yaml       # Basic SAM template
│   └── go.mod              # Module definition
├── aws-rust/
│   ├── template.yaml       # Basic SAM template
│   └── Cargo.toml          # Dependencies defined
└── cloudflare-typescript/
    ├── wrangler.toml       # Wrangler config
    ├── package.json        # Dependencies defined
    └── tsconfig.json       # TypeScript config
```

---

## Phase 1: AWS Python Implementation

- **STATUS:** PENDING
- **Goal:** Implement in Python - validates multi-language approach
- **Estimated Effort:** Small (2-3 sessions)
- **Notes:**
    - Python is familiar territory - use it to validate the porting process
    - BeautifulSoup for HTML parsing, requests for HTTP
    - Pydantic for request/response validation (matches API contract)
    - Follow SAM patterns from TypeScript implementation

### Target State:

```
implementations/aws-python/
├── template.yaml
├── requirements.txt
├── src/
│   ├── handlers/
│   │   ├── validate.py
│   │   ├── issues.py
│   │   ├── sites.py
│   │   └── health.py
│   ├── validators/
│   │   ├── __init__.py
│   │   ├── structured_data.py
│   │   ├── indexing.py
│   │   ├── performance.py
│   │   └── mobile.py
│   ├── db/
│   │   └── dynamodb.py
│   └── models/
│       └── schemas.py       # Pydantic models
└── tests/
    └── ...
```

### Tasks:

- **1.1. SAM Template:**
    - File: `implementations/aws-python/template.yaml`
    - Define Python 3.12 runtime functions
    - Copy DynamoDB table definitions from TypeScript
    - Configure IAM policies (identical to TypeScript)

- **1.2. Pydantic Models:**
    - File: `implementations/aws-python/src/models/schemas.py`
    - Define Issue, Site, ValidationRequest, ValidationResponse models
    - Match JSON schemas from `shared/schemas/`

- **1.3. DynamoDB Access Layer:**
    - File: `implementations/aws-python/src/db/dynamodb.py`
    - Implement using boto3 with type hints
    - Match TypeScript implementation interface

- **1.4. Validators:**
    - Files: `implementations/aws-python/src/validators/*.py`
    - Port each validator from TypeScript
    - Use BeautifulSoup for HTML parsing
    - Use requests for HTTP calls

- **1.5. Handlers:**
    - Files: `implementations/aws-python/src/handlers/*.py`
    - Lambda handler for each endpoint
    - Use Pydantic for validation

- **1.6. Verify:**
    - Run: `sam build && sam local start-api`
    - Run shared test fixtures against local API
    - Compare response JSON with TypeScript (should be identical)
    - Deploy and test with calminterview.com

---

## Phase 2: AWS Go Implementation

- **STATUS:** PENDING
- **Goal:** Learn Go while implementing a real service
- **Estimated Effort:** Medium (4-6 sessions)
- **Notes:**
    - First time using Go - expect learning curve
    - Read Go basics before starting (links in Implementation Strategy)
    - Go's explicit error handling differs from Python/TypeScript
    - Use goquery for HTML parsing, net/http for requests

### Target State:

```
implementations/aws-go/
├── template.yaml
├── go.mod
├── go.sum
├── cmd/
│   ├── validate/
│   │   └── main.go
│   ├── issues/
│   │   └── main.go
│   ├── sites/
│   │   └── main.go
│   └── health/
│       └── main.go
├── internal/
│   ├── validators/
│   │   ├── structured_data.go
│   │   ├── indexing.go
│   │   ├── performance.go
│   │   └── mobile.go
│   ├── db/
│   │   └── dynamodb.go
│   └── models/
│       └── types.go
└── tests/
    └── ...
```

### Tasks:

- **2.1. SAM Template:**
    - File: `implementations/aws-go/template.yaml`
    - Use `provided.al2023` runtime with arm64 architecture
    - Configure build with `go build` in Makefile
    - Copy table definitions from TypeScript

- **2.2. Type Definitions:**
    - File: `implementations/aws-go/internal/models/types.go`
    - Define structs for Issue, Site, ValidationRequest, etc.
    - Add JSON tags for marshaling

- **2.3. DynamoDB Access Layer:**
    - File: `implementations/aws-go/internal/db/dynamodb.go`
    - Use aws-sdk-go-v2
    - Implement same interface as other implementations

- **2.4. Validators:**
    - Files: `implementations/aws-go/internal/validators/*.go`
    - Use goquery for HTML parsing
    - Implement each validator following Go error handling patterns

- **2.5. Handlers:**
    - Files: `implementations/aws-go/cmd/*/main.go`
    - Use aws-lambda-go for Lambda integration
    - Each handler in separate cmd/ directory (Go convention)

- **2.6. Verify:**
    - Run: `go test ./...`
    - Build and test locally with SAM
    - Run shared test fixtures
    - Benchmark: `go test -bench=.`
    - Document cold start time and latency in tracking summary

---

## Phase 3: AWS Rust Implementation

- **STATUS:** PENDING
- **Goal:** Learn Rust while implementing for maximum performance
- **Estimated Effort:** Large (6-10 sessions)
- **Notes:**
    - Rust has steep learning curve - ownership, borrowing, lifetimes
    - Read Rust basics before starting (links in Implementation Strategy)
    - Use scraper crate for HTML, reqwest for HTTP
    - Async/await with tokio runtime
    - Expect this to take significantly longer than other implementations

### Target State:

```
implementations/aws-rust/
├── template.yaml
├── Cargo.toml
├── Cargo.lock
├── src/
│   ├── main.rs              # Entry point
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── validate.rs
│   │   ├── issues.rs
│   │   ├── sites.rs
│   │   └── health.rs
│   ├── validators/
│   │   ├── mod.rs
│   │   ├── structured_data.rs
│   │   ├── indexing.rs
│   │   ├── performance.rs
│   │   └── mobile.rs
│   ├── db/
│   │   └── dynamodb.rs
│   └── types/
│       └── mod.rs
└── tests/
    └── ...
```

### Tasks:

- **3.1. SAM Template:**
    - File: `implementations/aws-rust/template.yaml`
    - Use `provided.al2023` runtime with arm64
    - Configure cargo-lambda for building
    - Copy table definitions

- **3.2. Type Definitions:**
    - File: `implementations/aws-rust/src/types/mod.rs`
    - Define structs with serde derive macros
    - Implement proper error types

- **3.3. DynamoDB Access Layer:**
    - File: `implementations/aws-rust/src/db/dynamodb.rs`
    - Use aws-sdk-dynamodb with tokio runtime
    - Handle async properly with Result types

- **3.4. Validators:**
    - Files: `implementations/aws-rust/src/validators/*.rs`
    - Use scraper crate for HTML parsing
    - Use reqwest for async HTTP
    - Proper error propagation with `?` operator

- **3.5. Handlers:**
    - Files: `implementations/aws-rust/src/handlers/*.rs`
    - Use lambda_runtime crate
    - Async handlers with tokio

- **3.6. Verify:**
    - Run: `cargo test`
    - Build: `cargo lambda build --release --arm64`
    - Test with SAM locally
    - Run shared test fixtures
    - Benchmark cold start (should be ~50ms, fastest of all)
    - Document memory usage and performance in tracking summary

---

## Phase 4: Cloudflare TypeScript Implementation

- **STATUS:** PENDING
- **Goal:** Port to Cloudflare Workers with D1 database
- **Estimated Effort:** Medium (3-4 sessions)
- **Notes:**
    - Different platform, same API contract
    - D1 uses SQL instead of DynamoDB's NoSQL - need schema migration
    - Can reuse some TypeScript code from AWS implementation
    - Hono framework for routing (lightweight, Workers-optimized)

### Target State:

```
implementations/cloudflare-typescript/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── schema.sql                # D1 database schema
├── src/
│   ├── index.ts              # Entry point with Hono routes
│   ├── validators/
│   │   ├── index.ts
│   │   ├── structured-data.ts
│   │   ├── indexing.ts
│   │   ├── performance.ts
│   │   └── mobile.ts
│   ├── db/
│   │   └── d1.ts             # D1 access layer
│   └── types/
│       └── index.ts
└── tests/
    └── ...
```

### Tasks:

- **4.1. D1 Database Schema:**
    - File: `implementations/cloudflare-typescript/schema.sql`
    - Create `sites` table (SQL equivalent of DynamoDB Sites table)
    - Create `issues` table with indexes
    - Document in `docs/setup/cloudflare.md`

- **4.2. Wrangler Configuration:**
    - File: `implementations/cloudflare-typescript/wrangler.toml`
    - Configure D1 binding
    - Set up cron trigger for scheduled validation
    - Create `wrangler.toml.example` for users

- **4.3. D1 Access Layer:**
    - File: `implementations/cloudflare-typescript/src/db/d1.ts`
    - SQL queries instead of DynamoDB calls
    - Match same interface as other implementations

- **4.4. Port Validators:**
    - Files: `implementations/cloudflare-typescript/src/validators/*.ts`
    - Adapt from AWS TypeScript implementation
    - Handle Workers fetch API vs Node.js

- **4.5. Hono Routes:**
    - File: `implementations/cloudflare-typescript/src/index.ts`
    - Set up Hono with all endpoints
    - Match response format exactly

- **4.6. Verify:**
    - Run: `npm run dev` (wrangler dev)
    - Run shared test fixtures against local
    - Deploy: `npm run deploy`
    - Test with real site
    - Confirm API responses match other implementations

---

## Phase 5: Cross-Implementation Testing

- **STATUS:** PENDING
- **Goal:** Ensure all implementations behave identically
- **Estimated Effort:** Small (1-2 sessions)
- **Notes:**
    - Critical for the project's value proposition
    - Users should be able to swap implementations without changing clients
    - Responses must be byte-identical (except timestamps, UUIDs)

### Target State:

```
shared/
└── integration-tests/
    ├── run-tests.sh          # Test runner script
    ├── compare-responses.js  # Response comparison utility
    └── test-cases/
        ├── validate-basic.json
        ├── validate-issues.json
        └── ...
```

### Tasks:

- **5.1. Create Test Runner:**
    - File: `shared/integration-tests/run-tests.sh`
    - Accept API_URL as parameter
    - Run all test cases from `shared/test-fixtures/requests/`
    - Compare responses against `shared/test-fixtures/responses/`

- **5.2. Create Response Comparator:**
    - File: `shared/integration-tests/compare-responses.js`
    - Deep compare JSON responses
    - Ignore fields: `validation_id`, `checked_at`, `detected_at`
    - Report any differences

- **5.3. Deploy All Implementations:**
    - Deploy AWS TypeScript, Python, Go, Rust to dev
    - Deploy Cloudflare to dev
    - Record API URLs

- **5.4. Run Comparison Tests:**
    - Run test suite against each implementation
    - Generate diff report
    - Fix any inconsistencies found

- **5.5. Performance Benchmarking:**
    - Measure cold start time for each implementation
    - Measure request latency (p50, p95, p99)
    - Measure memory usage
    - Document in comparison table

- **5.6. Update README:**
    - File: `README.md`
    - Add performance comparison table
    - Note implementation-specific quirks (if any)
    - Add recommendations by use case

---

## Expected Results

After completing this workplan:
- Five total implementations all passing shared test suite
- All implementations produce identical API responses
- Performance comparison documented in README
- Users can choose implementation based on their stack preference
- Personal learning: proficiency in Go and Rust basics

---

## Risks & Unknowns

- **Risk:** Go/Rust learning curve may extend timelines significantly
- **Risk:** Cloudflare D1 has different consistency model than DynamoDB
- **Unknown:** Will validator logic port cleanly or need platform-specific handling?
- **Unknown:** Rust Lambda cold start in practice (documentation says ~50ms)

---

## TRACKING SUMMARY

_To be filled in after completion of work in a phase_

### Phase 1 Completed Features

- TBD

### Phase 2 Completed Features

- TBD

### Phase 3 Completed Features

- TBD

### Phase 4 Completed Features

- TBD

### Phase 5 Completed Features

- TBD

### Additional Implementations Beyond Original Tasks

- TBD

### Deferred/Not Implemented Items

- TBD

### Technical Notes and Learnings

- TBD

### Key Files Modified

- TBD
