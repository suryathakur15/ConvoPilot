#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-frontend.sh
# Builds the Vite frontend and syncs it to S3, then invalidates CloudFront.
#
# Usage:
#   ./infra/scripts/deploy-frontend.sh <CF_STACK_NAME> [aws-profile]
#
# Prerequisites:
#   - AWS CLI v2 installed and configured
#   - Node 20+ installed locally
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

STACK_NAME="${1:-convopilot-demo}"
PROFILE="${2:-default}"
SSL_MODE="${3:-ssl}"                         # always ssl by default
SSL_DOMAIN_DEFAULT="convo-test-api.neary.in" # change if domain changes
AWS_REGION="eu-central-1"
AWS="aws --profile $PROFILE --region $AWS_REGION"

echo "=== ConvoPilot frontend deploy ==="
echo "Stack : $STACK_NAME"
echo "Profile: $PROFILE"
echo ""

# ── Pull outputs from CloudFormation ─────────────────────────────────────────
get_output() {
  $AWS cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

BACKEND_API_URL=$(get_output BackendAPIURL)
BACKEND_SOCKET_URL=$(get_output BackendSocketURL)
S3_BUCKET=$(get_output FrontendBucketName)
CF_DOMAIN=$(get_output FrontendURL)

# Override with HTTPS domain if ssl mode (default)
if [[ "$SSL_MODE" == "ssl" ]]; then
  SSL_DOMAIN="${4:-${SSL_DOMAIN:-$SSL_DOMAIN_DEFAULT}}"
  BACKEND_API_URL="https://$SSL_DOMAIN/api"
  BACKEND_SOCKET_URL="https://$SSL_DOMAIN"
  echo "SSL mode: $BACKEND_API_URL"
fi
# Get CloudFront distribution ID directly from CloudFormation stack resources
CF_DIST_ID=$($AWS cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query "StackResources[?ResourceType=='AWS::CloudFront::Distribution'].PhysicalResourceId" \
  --output text)

echo "Backend API : $BACKEND_API_URL"
echo "Socket URL  : $BACKEND_SOCKET_URL"
echo "S3 Bucket   : $S3_BUCKET"
echo "CloudFront  : $CF_DOMAIN"
echo ""

# ── Build ─────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT/frontend"

echo "Building frontend..."
VITE_API_URL="$BACKEND_API_URL" \
VITE_SOCKET_URL="$BACKEND_SOCKET_URL" \
VITE_AI_ENABLED=true \
npm run build

echo "Build complete → dist/"
echo ""

# ── Sync to S3 ────────────────────────────────────────────────────────────────
echo "Uploading to s3://$S3_BUCKET ..."
$AWS s3 sync dist/ "s3://$S3_BUCKET" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# index.html must NOT be cached so users always get the latest shell
$AWS s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "Upload complete."
echo ""

# ── CloudFront invalidation ───────────────────────────────────────────────────
if [[ -n "$CF_DIST_ID" ]]; then
  echo "Invalidating CloudFront distribution $CF_DIST_ID ..."
  INVALIDATION_ID=$($AWS cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)
  echo "Invalidation started: $INVALIDATION_ID"
  echo "(Takes ~1–2 min to propagate globally)"
else
  echo "Warning: could not determine CloudFront distribution ID — invalidate manually."
fi

echo ""
echo "=== Done ==="
echo "Frontend URL: $CF_DOMAIN"
