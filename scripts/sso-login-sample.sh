#!/usr/bin/env bash
set -euo pipefail

# Sample SSO login script - copy to sso-login.sh and customize with your profile.
#
# Setup:
#   cp scripts/sso-login-sample.sh scripts/sso-login.sh
#   # Edit sso-login.sh and set your AWS profile below
#
# Usage:
#   source scripts/sso-login.sh

# ============================================================
# CONFIGURE YOUR AWS PROFILE HERE
# ============================================================
PROFILE="${1:-your-aws-profile-name}"
# ============================================================

aws sso login --profile "$PROFILE"
export AWS_PROFILE="$PROFILE"

echo "Logged in with profile: $PROFILE"
