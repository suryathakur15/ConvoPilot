#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# create-stack.sh  —  one-shot CloudFormation deploy
#
# Fill in the variables below, then run:
#   chmod +x infra/scripts/create-stack.sh && ./infra/scripts/create-stack.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Edit these ────────────────────────────────────────────────────────────────
STACK_NAME="convopilot-demo"
AWS_REGION="eu-central-1"              # Frankfurt — closest to Germany
AWS_PROFILE="default"

KEY_PAIR_NAME="convopilot-demo"        # ~/.ssh/convopilot-demo.pem
GIT_REPO_URL="https://github.com/suryathakur15/ConvoPilot.git"   # ← update this

DB_PASSWORD="SuryaDataBase@123"     # ← set a strong password (min 12 chars)
REDIS_PASSWORD="SuryaRedis@123"  # ← set a strong password (min 12 chars)

AI_PROVIDER="gemini"                   # gemini | claude | openai
AI_API_KEY="AIzaSyA6Ql-wk7qAyWVW4XZoRshOuu9EWMJ754U"    # ← paste your Gemini API key
AI_MODEL="gemini-2.0-flash"

INSTANCE_TYPE="t3.small"              # 2 vCPU / 2 GB — fine for demo
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
