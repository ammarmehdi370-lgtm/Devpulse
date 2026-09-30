#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="${SCRIPT_DIR}/../keys"
mkdir -p "$KEYS_DIR"

PRIVATE_KEY="$KEYS_DIR/private.pem"
PUBLIC_KEY="$KEYS_DIR/public.pem"

if [[ -f "$PRIVATE_KEY" && -f "$PUBLIC_KEY" ]]; then
	echo "Keys already exist at $KEYS_DIR"
	echo "Delete them first to regenerate:"
	echo "  rm apps/api/keys/*.pem"
	exit 0
fi

echo "Generating RS256 key pair..."
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_KEY" 2>/dev/null
echo "Private key: $PRIVATE_KEY"

openssl pkey -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null
echo "Public key: $PUBLIC_KEY"

openssl pkey -in "$PRIVATE_KEY" -check -noout 2>/dev/null
echo "Key pair verified"

chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"
echo "Permissions set (private: 600, public: 644)"

cat <<'EOF'

Keys ready. Add to .env:
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

Never commit these files. They are excluded by .gitignore.
EOF