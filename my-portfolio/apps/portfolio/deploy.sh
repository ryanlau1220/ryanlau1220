#!/usr/bin/env bash

# Manual production fallback. GitHub Actions is the primary deployment path.
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

echo "🏗️ Building production client & server assets..."
pnpm run build

echo "🗃️ Applying pending D1 migrations..."
pnpm exec wrangler d1 migrations apply VISITOR_LOG_DB --remote

echo "🚀 Deploying to Cloudflare Workers..."
pnpm exec wrangler deploy
