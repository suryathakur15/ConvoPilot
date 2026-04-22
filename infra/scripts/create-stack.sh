#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# create-stack.sh  —  one-shot CloudFormation deploy
#
# Fill in the variables below, then run:
#   chmod +x infra/scripts/create-stack.sh && ./infra/scripts/create-stack.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Edit these ────────────────────────────────────────────────────────────────
STACK_NAME="convopilot"
AWS_REGION="us-east-1"
AWS_PROFILE="default"

KEY_PAIR_NAME="my-ec2-keypair"          # Must already exist in the region
GIT_REPO_URL="https://github.com/you/convopilot.git"

DB_PASSWORD="ChangeMe_DB_Secret_1"      # Min 12 chars
REDIS_PASSWORD="ChangeMe_Redis_S3cr3t"  # Min 12 chars

AI_PROVIDER="gemini"                    # gemini | claude | openai
AI_API_KEY="your-api-key-here"
AI_MODEL="gemini-2.0-flash"

INSTANCE_TYPE="t3.small"               # t3.small = 2 vCPU / 2 GB — fine for demo
# ─────────────────────────────────────────────────────────────────────────────

TEMPLATE_FILE="$(cd "$(dirname "$0")/.." && pwd)/cloudformation.yml"

echo "Deploying stack: $STACK_NAME in $AWS_REGION ..."

aws cloudformation deploy \
  --profile "$AWS_PROFILE" \
  --region  "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    KeyPairName="$KEY_PAIR_NAME" \
    GitRepoURL="$GIT_REPO_URL" \
    DBPassword="$DB_PASSWORD" \
    RedisPassword="$REDIS_PASSWORD" \
    AIProvider="$AI_PROVIDER" \
    AIApiKey="$AI_API_KEY" \
    AIModel="$AI_MODEL" \
    InstanceType="$INSTANCE_TYPE"

echo ""
echo "=== Stack outputs ==="
aws cloudformation describe-stacks \
  --profile "$AWS_PROFILE" \
  --region  "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table

echo ""
echo "Next steps:"
echo "  1. Wait ~5 min for Docker Compose to finish building on EC2"
echo "  2. ./infra/scripts/deploy-frontend.sh $STACK_NAME $AWS_PROFILE"
