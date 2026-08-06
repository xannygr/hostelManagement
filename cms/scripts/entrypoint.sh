#!/bin/sh
set -e

echo "HostelHaven CMS starting (Node $(node -v))..."

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-1337}"

# --- Strapi secrets -------------------------------------------------------
# Railway deploys need a full set of secrets. If any are missing we generate
# throwaway ones so the app boots immediately. Session/token stability is only
# guaranteed once real values are set as Railway service variables.
export APP_KEYS="${APP_KEYS:-$(node -e "const c=require('crypto');console.log([c.randomBytes(32).toString('base64'),c.randomBytes(32).toString('base64')].join(','))")}"
export API_TOKEN_SALT="${API_TOKEN_SALT:-$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")}"
export ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET:-$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")}"
export TRANSFER_TOKEN_SALT="${TRANSFER_TOKEN_SALT:-$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")}"
export JWT_SECRET="${JWT_SECRET:-$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")}"

exec npm run start
