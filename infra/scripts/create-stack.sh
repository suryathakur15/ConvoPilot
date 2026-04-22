#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# create-stack.sh  —  one-shot CloudFormation deploy
#
# Fill in the variables below, then run:
#   chmod +x infra/scripts/create-stack.sh && ./infra/scripts/create-stack.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Non-secret config (safe to commit) ───────────────────────────────────────
STACK_NAME="convopilot-demo"
AWS_REGION="eu-central-1"
AWS_PROFILE="default"
KEY_PAIR_NAME="convopilot-demo"
GIT_REPO_URL="https://github.com/suryathakur15/ConvoPilot.git"
INSTANCE_TYPE="t3.small"

# ── Secrets — read from environment (set via .env.infra, never hardcode) ─────
DB_PASSWORD="${CONVOPILOT_DB_PASSWORD:?Set CONVOPILOT_DB_PASSWORD in .env.infra}"
REDIS_PASSWORD="${CONVOPILOT_REDIS_PASSWORD:?Set CONVOPILOT_REDIS_PASSWORD in .env.infra}"

AI_PROVIDER="${CONVOPILOT_AI_PROVIDER:-gemini}"
AI_MODEL="${CONVOPILOT_AI_MODEL:-gemini-2.5-flash-lite}"

GEMINI_API_KEY="${CONVOPILOT_GEMINI_API_KEY:-}"
GEMINI_MODEL="${CONVOPILOT_GEMINI_MODEL:-gemini-2.5-flash-lite}"

OPENAI_API_KEY="${CONVOPILOT_OPENAI_API_KEY:-}"
OPENAI_MODEL="${CONVOPILOT_OPENAI_MODEL:-gpt-4o}"

ANTHROPIC_API_KEY="${CONVOPILOT_ANTHROPIC_API_KEY:-}"
ANTHROPIC_MODEL="${CONVOPILOT_ANTHROPIC_MODEL:-claude-3-5-haiku-20241022}"
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
    AIModel="$AI_MODEL" \
    GeminiApiKey="$GEMINI_API_KEY" \
    GeminiModel="$GEMINI_MODEL" \
    OpenAIApiKey="$OPENAI_API_KEY" \
    OpenAIModel="$OPENAI_MODEL" \
    AnthropicApiKey="$ANTHROPIC_API_KEY" \
    AnthropicModel="$ANTHROPIC_MODEL" \
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
