#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_DIR="${SCRIPT_DIR}/../keys"

mkdir -p "${KEY_DIR}"
openssl genrsa -out "${KEY_DIR}/private.pem" 2048
openssl rsa -in "${KEY_DIR}/private.pem" -pubout -out "${KEY_DIR}/public.pem"
chmod 600 "${KEY_DIR}/private.pem"
echo "Keys generated in ${KEY_DIR}/"