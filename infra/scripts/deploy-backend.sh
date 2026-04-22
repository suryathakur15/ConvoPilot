#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-backend.sh
# SSH into the EC2 instance and pull + restart the Docker Compose stack.
# Run this after pushing new commits to your git repo.
#
# Usage:
#   ./infra/scripts/deploy-backend.sh <CF_STACK_NAME> <KEY_FILE> [aws-profile]
#
# Example:
#   ./infra/scripts/deploy-backend.sh convopilot ~/.ssh/my-key.pem
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

STACK_NAME="${1:-convopilot-demo}"
KEY_FILE="${2:-~/.ssh/convopilot-demo.pem}"
PROFILE="${3:-default}"
AWS_REGION="eu-central-1"
AWS="aws --profile $PROFILE --region $AWS_REGION"

echo "=== ConvoPilot backend deploy ==="

# ── Get Elastic IP from CF ────────────────────────────────────────────────────
EC2_IP=$($AWS cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='BackendIP'].OutputValue" \
  --output text)

echo "EC2 IP  : $EC2_IP"
echo "Key file: $KEY_FILE"
echo ""

SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=no ec2-user@$EC2_IP"

# ── Pull latest code and rebuild ──────────────────────────────────────────────
echo "Pulling latest code on EC2..."
$SSH << 'REMOTE'
  set -euo pipefail
  cd /opt/convopilot

  echo "→ git pull"
  git pull

  echo "→ docker compose build (no-cache for backend + ai-service)"
  docker compose -f infra/docker-compose.prod.yml build --no-cache backend ai-service

  echo "→ docker compose up -d"
  docker compose -f infra/docker-compose.prod.yml up -d

  echo "→ running migrations"
  docker exec convopilot_backend node migrations/run.js

  echo "→ container status"
  docker compose -f infra/docker-compose.prod.yml ps
REMOTE

echo ""
echo "=== Backend deploy complete ==="
echo "API: http://$EC2_IP/api/health"
