#!/usr/bin/env bash
set -e

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

if [ -f "$ENV_FILE" ]; then
  echo ".env already exists"
  echo "Delete it first to recreate:"
  echo "  rm .env && bash scripts/setup-env.sh"
  exit 0
fi

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "ERROR: .env.example not found" >&2
  exit 1
fi

cp "$EXAMPLE_FILE" "$ENV_FILE"
echo "Created .env from .env.example"
echo
echo "Next steps:"
echo "1. Generate SESSION_SECRET:"
echo "   openssl rand -hex 32"
echo "   Add the output to .env as SESSION_SECRET=<output>"
echo
echo "2. Generate JWT keys:"
echo "   bash apps/api/scripts/generate-keys.sh"
echo
echo "3. Add optional credentials as needed:"
echo "   ANTHROPIC_API_KEY (for AI features)"
echo "   RESEND_API_KEY (for email)"
echo "   GITHUB_CLIENT_ID (for GitHub login)"
