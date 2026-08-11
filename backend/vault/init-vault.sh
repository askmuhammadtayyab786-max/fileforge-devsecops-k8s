#!/bin/sh
set -e

# Use Docker network service name 'vault' instead of 127.0.0.1
VAULT_ADDR="http://vault:8200"
VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-root}"

echo "⏳ Waiting for Vault server at $VAULT_ADDR to start..."
until vault status -address="$VAULT_ADDR" > /dev/null 2>&1; do
  sleep 1
done

echo "🔐 Step 1: Authenticating with Vault..."
export VAULT_ADDR="$VAULT_ADDR"
export VAULT_TOKEN="$VAULT_TOKEN"

echo "🔑 Step 2: Enabling KV v2 Secrets Engine..."
vault secrets enable -path=secret kv-v2 2>/dev/null || true

if [ -f /env_file/.env ]; then
  echo "📥 Step 3: Reading backend/.env variables..."
  
  # Strip comments and empty lines, pass as key-value pairs
  ENV_VARS=$(grep -v '^#' /env_file/.env | grep -v '^$' | xargs)
  
  echo "🚀 Step 4: Storing secrets in Vault at 'secret/fileforge/backend'..."
  vault kv put secret/fileforge/backend $ENV_VARS
  
  echo "✅ Success: Secrets stored in Vault!"
else
  echo "❌ Error: /env_file/.env not found!"
  exit 1
fi
