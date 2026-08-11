#!/usr/bin/env bash
# Scans every image this project builds/pulls for known CVEs using Trivy.
# Chainguard's node/nginx images should come back with ~0 findings; mongo:7
# (official image, kept for auth-bootstrapping reasons — see docker-compose.yaml)
# should be reviewed and re-pinned to a fresh digest whenever this reports
# HIGH/CRITICAL findings.
#
# Install Trivy: https://trivy.dev/latest/getting-started/installation/
# Usage: ./scripts/scan-images.sh

set -euo pipefail

if ! command -v trivy >/dev/null 2>&1; then
  echo "Trivy is not installed. See https://trivy.dev/latest/getting-started/installation/" >&2
  exit 1
fi

SEVERITY="${SEVERITY:-HIGH,CRITICAL}"

echo "── Building local images ──────────────────────────────────────────"
docker build -t fileforge-backend:scan  ./backend
docker build -t fileforge-frontend:scan ./frontend

echo
echo "── Scanning backend (Chainguard node) ─────────────────────────────"
trivy image --severity "$SEVERITY" --exit-code 1 fileforge-backend:scan

echo
echo "── Scanning frontend (Chainguard node + nginx) ────────────────────"
trivy image --severity "$SEVERITY" --exit-code 1 fileforge-frontend:scan

echo
echo "── Scanning mongo:7 (pinned digest from docker-compose.yaml) ──────"
MONGO_REF=$(grep -m1 '^\s*image: mongo:7@sha256:' docker-compose.yaml | awk '{print $2}')
if [[ "$MONGO_REF" == *REPLACE_WITH_DIGEST* ]]; then
  echo "⚠️  docker-compose.yaml still has the placeholder mongo digest — pin it first:"
  echo "    docker pull mongo:7 && docker inspect --format='{{index .RepoDigests 0}}' mongo:7"
else
  trivy image --severity "$SEVERITY" --exit-code 1 "$MONGO_REF"
fi

echo
echo "✅ No $SEVERITY findings in any scanned image."
