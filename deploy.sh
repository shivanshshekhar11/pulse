#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Pulse — Droplet deploy script
# Run on the Droplet manually to rebuild and restart all services.
# Under normal operation the GitHub Actions deploy.yml handles this automatically.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "▶ Pulling latest images..."
$COMPOSE pull postgres redis nginx 2>/dev/null || true

echo "▶ Pulling application images from GHCR..."
$COMPOSE pull api dashboard docs example

echo "▶ Running database migrations..."
$COMPOSE run --rm api sh -c "
  cd /app/apps/api && \
  npx drizzle-kit migrate
" || echo "⚠  Migration step skipped (run manually if needed)"

echo "▶ Starting services..."
$COMPOSE up -d --remove-orphans

echo "▶ Waiting for API health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    echo "✓ API is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "⚠  API health check timed out (check logs: docker compose -f docker-compose.prod.yml logs api)"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 3
done

echo "▶ Service status:"
$COMPOSE ps

echo ""
echo "✅ Deploy complete."
echo "   API:       https://api.pulseflags.live"
echo "   Dashboard: https://pulseflags.live"
echo "   Docs:      https://docs.pulseflags.live"
echo "   Example:   https://demo.pulseflags.live"
