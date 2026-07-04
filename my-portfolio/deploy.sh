#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🧹 Cleaning previous build..."
rm -rf dist

echo "🏗️ Building production client & server assets..."
pnpm run build

echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy
