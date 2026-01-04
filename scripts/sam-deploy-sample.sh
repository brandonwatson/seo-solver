#!/bin/bash
# scripts/sam-deploy-sample.sh
#
# Sample SAM deploy script - copy to sam-deploy.sh and customize with your profile.
#
# Deploy the SAM application for a specific environment (dev or prod).
# - Uses an environment-specific stack name
# - Uses --resolve-s3 unless SAM_S3_BUCKET is provided
#
# Setup:
#   cp scripts/sam-deploy-sample.sh scripts/sam-deploy.sh
#   # Edit sam-deploy.sh and set your AWS profile below
#
# Usage:
#   ./scripts/sam-deploy.sh dev
#   ./scripts/sam-deploy.sh prod

set -e

ENVIRONMENT=${1:-dev}
SAM_DIR="implementations/aws-typescript"

# ============================================================
# CONFIGURE YOUR AWS PROFILE HERE
# ============================================================
PROFILE="${AWS_PROFILE:-your-aws-profile-name}"
export AWS_PROFILE="$PROFILE"
# ============================================================

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo "Usage: $0 [dev|prod]"
    echo "Example: $0 dev"
    exit 1
fi

# Stack name per environment
if [[ "$ENVIRONMENT" == "prod" ]]; then
    STACK_NAME="seo-solver-prod"
else
    STACK_NAME="seo-solver-dev"
fi

# Change to the SAM directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../$SAM_DIR" || exit 1

echo "======================================================"
echo "Building SAM application for '$ENVIRONMENT' environment"
echo "Using profile: $AWS_PROFILE"
echo "Stack name: $STACK_NAME"
echo "======================================================"

# Validate template before building
echo "Validating SAM template..."
sam validate --lint
if [ $? -ne 0 ]; then
    echo "❌ Template validation failed. Fix errors before deploying."
    exit 1
fi
echo "✅ Template valid"
echo ""

# Build (no --use-container needed for TypeScript)
sam build --cached

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo ""
echo "======================================================"
echo "Deploying SAM application to '$ENVIRONMENT' environment"
echo "======================================================"

# Use an explicit S3 bucket if provided, otherwise let SAM resolve
if [[ -n "${SAM_S3_BUCKET:-}" ]]; then
    echo "Using provided S3 bucket: $SAM_S3_BUCKET"
    SAM_S3_ARG="--s3-bucket $SAM_S3_BUCKET"
else
    SAM_S3_ARG="--resolve-s3"
fi

# Deploy
sam deploy \
    --stack-name "$STACK_NAME" \
    $SAM_S3_ARG \
    --parameter-overrides StageName="$ENVIRONMENT" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --capabilities CAPABILITY_IAM

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SAM deployment for '$ENVIRONMENT' successful!"
    echo ""
    # Show outputs
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs" \
        --output table
else
    echo "❌ SAM deployment for '$ENVIRONMENT' failed."
    exit 1
fi
