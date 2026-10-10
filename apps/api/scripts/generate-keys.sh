#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="${SCRIPT_DIR}/../keys"
mkdir -p "$KEYS_DIR"

PRIVATE_KEY="$KEYS_DIR/private.pem"
PUBLIC_KEY="$KEYS_DIR/public.pem"

if [[ -f "$PRIVATE_KEY" && -f "$PUBLIC_KEY" ]]; then
	echo "Keys already exist at $KEYS_DIR"
	exit 0
fi

if [[ -f "$PUBLIC_KEY" && ! -f "$PRIVATE_KEY" ]]; then
	echo "ERROR: Public key exists without its private key at $KEYS_DIR" >&2
	echo "Restore the matching private key or move the public key aside before generating a new pair." >&2
	exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
	echo "ERROR: openssl was not found. Install OpenSSL and retry." >&2
	exit 1
fi

echo "Generating RS256 key pair..."
temporary_private="$(mktemp "$KEYS_DIR/private.XXXXXX")"
temporary_public="$(mktemp "$KEYS_DIR/public.XXXXXX")"
trap 'rm -f "$temporary_private" "$temporary_public"' EXIT

if [[ -f "$PRIVATE_KEY" ]]; then
	openssl pkey -in "$PRIVATE_KEY" -pubout -out "$temporary_public"
else
	openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$temporary_private"
	openssl pkey -in "$temporary_private" -pubout -out "$temporary_public"
	openssl pkey -in "$temporary_private" -check -noout
	chmod 600 "$temporary_private"
	mv "$temporary_private" "$PRIVATE_KEY"
fi

mv "$temporary_public" "$PUBLIC_KEY"
chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

openssl pkey -in "$PRIVATE_KEY" -check -noout
echo "Key pair verified"
echo "Permissions set (private: 600, public: 644)"

cat <<'EOF'

Keys ready. Add to .env:
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

Never commit these files. They are excluded by .gitignore.
EOF