#!/usr/bin/env bash

# Manual production deployment. A GitHub Actions job will become the primary path later.
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

echo "🏗️ Building production client & server assets..."
pnpm run build

echo "🗃️ Applying pending D1 migrations..."
pnpm exec wrangler d1 migrations apply DIARY_DB --remote

echo "🚀 Deploying to Cloudflare Workers..."
pnpm exec wrangler deploy
