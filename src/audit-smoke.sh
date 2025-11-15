#!/usr/bin/env bash
# audit-smoke.sh
# Lightweight smoke test for Naelix API (health, api, metrics, auth/session persistence, redis, mongo)
# Usage:
#   ./audit-smoke.sh                         # uses defaults (localhost:8080)
#   HOST=http://example.com ./audit-smoke.sh
#   HOST=http://localhost:8080 TEST_EMAIL=me@x.com TEST_PASSWORD=pass ./audit-smoke.sh
#
# Prereqs (recommended on the machine running the script):
# - curl, jq (for JSON pretty), redis-cli (optional), mongosh or mongo (optional), pm2 (optional)

set -euo pipefail
IFS=$'\n\t'

# -------- CONFIG --------
HOST="${HOST:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-password}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/audit_cookies.txt}"
SENTRY_TEST_ROUTE="${SENTRY_TEST_ROUTE:-/internal/test-sentry}"
SESSION_DEBUG_ROUTE="${SESSION_DEBUG_ROUTE:-/internal/session-debug}"
APP_PM2_NAME="${APP_PM2_NAME:-}"    # set to pm2 process name if you want the script to restart the app
SYSTEMD_SERVICE="${SYSTEMD_SERVICE:-}" # set to systemd service name to restart if desired
REDIS_URL="${REDIS_URL:-${REDIS_URL_ENV:-}}" # optional; you can also rely on server env
MONGO_URI="${MONGO_URI:-${MONGO_URI_ENV:-}}"
TIMEOUT_CURL=8

echo "==== Naelix API quick smoke audit ===="
echo "HOST=$HOST"
echo "TEST_EMAIL=$TEST_EMAIL"
echo

# helper: run curl with JSON output if available
curl_json() {
  local url="${1}"
  curl -sS --max-time $TIMEOUT_CURL "$url"
}

# 1) Health checks
echo "-> 1) Health check"
if res="$(curl -sS --max-time $TIMEOUT_CURL "$HOST/health")"; then
  echo "  /health -> OK"
  echo "$res" | jq -C . || echo "$res"
else
  echo "  /health -> FAILED (no response or timed out)"
fi
echo

echo "-> 2) API root"
if res="$(curl -sS --max-time $TIMEOUT_CURL "$HOST/api")"; then
  echo "  /api -> OK"
  echo "$res" | jq -C . || echo "$res"
else
  echo "  /api -> FAILED (no response or timed out)"
fi
echo

echo "-> 3) Metrics endpoint"
if res="$(curl -sS --max-time $TIMEOUT_CURL "$HOST/metrics")"; then
  echo "  /metrics -> OK"
  echo "$res" | jq -C . || echo "$res"
else
  echo "  /metrics -> FAILED (no response or timed out)"
fi
echo

# 2) Optional Sentry test route (server must expose it temporarily)
echo "-> 4) Sentry test route (optional)"
if curl -sS --max-time $TIMEOUT_CURL -I "$HOST${SENTRY_TEST_ROUTE}" | head -n1 | grep -q '200\|500\|404'; then
  echo "  Tried $SENTRY_TEST_ROUTE (server responded). Full request below:"
  curl -i -sS --max-time $TIMEOUT_CURL "$HOST${SENTRY_TEST_ROUTE}" || true
  echo "  Note: Check Sentry UI for a new event in ~10-30s if route throws."
else
  echo "  $SENTRY_TEST_ROUTE not available or no response — skip (you can add a server-side test route to trigger Sentry)."
fi
echo

# 3) Login -> protected route -> restart -> re-check (session persistence)
echo "-> 5) Auth & session persistence test"
rm -f "$COOKIE_JAR"
LOGIN_URL="$HOST/api/v1/auth/login"
PROTECTED1="$HOST/api/v1/profile"          # try common protected endpoints
PROTECTED2="$HOST/api/v1/profile/me"
PROTECTED3="$HOST/api/v1/admin"            # admin check (may 403)
echo "  Attempt login -> $LOGIN_URL (using test credentials)"

login_response="$(curl -sS -c "$COOKIE_JAR" -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" || true)"

echo "  Login response:"
echo "$login_response" | jq -C . || echo "$login_response"

# Inspect cookie file
if [ -s "$COOKIE_JAR" ]; then
  echo "  Cookie written to $COOKIE_JAR"
  echo "  Cookie preview:"
  sed -n '1,120p' "$COOKIE_JAR" | sed -n '1,20p'
else
  echo "  No cookie received. Login may have failed. Check credentials or /api/v1/auth/login route."
fi

# Try protected endpoints with cookie (in order)
for endpoint in "$PROTECTED2" "$PROTECTED1" "$PROTECTED3"; do
  echo "  Trying protected endpoint: $endpoint"
  http_status=$(curl -sS -b "$COOKIE_JAR" -o /tmp/audit_protected_response.json -w "%{http_code}" --max-time $TIMEOUT_CURL "$endpoint" || true)
  echo "   HTTP $http_status"
  if [ -s /tmp/audit_protected_response.json ]; then
    cat /tmp/audit_protected_response.json | jq -C . || cat /tmp/audit_protected_response.json
  fi
  echo
  # if one succeeded (200), don't keep trying others
  if [ "$http_status" = "200" ]; then
    PROTECTED_USED="$endpoint"
    break
  fi
done

if [ -z "${PROTECTED_USED:-}" ]; then
  echo "  No protected endpoint returned 200. Session may not be created or endpoints vary. Inspect login response and server logs."
else
  echo "  Protected endpoint $PROTECTED_USED returned 200 — session working pre-restart."
fi

# Optionally restart app (pm2/systemd) if variables provided
if [ -n "$APP_PM2_NAME" ]; then
  echo
  echo "  Restarting app via pm2: $APP_PM2_NAME"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart "$APP_PM2_NAME" && echo "  pm2 restart done"
  else
    echo "  pm2 not installed here. Skipping restart."
  fi
elif [ -n "$SYSTEMD_SERVICE" ]; then
  echo
  echo "  Restarting systemd service: $SYSTEMD_SERVICE"
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl restart "$SYSTEMD_SERVICE" && echo "  systemctl restart done"
  else
    echo "  systemctl not available. Skipping restart."
  fi
else
  echo
  echo "  No APP_PM2_NAME or SYSTEMD_SERVICE provided — skipping app restart."
fi

# Wait a moment for app to come back
echo "  Waiting 3s for app to settle..."
sleep 3

# Re-check protected endpoint with same cookie
if [ -n "${PROTECTED_USED:-}" ]; then
  echo "  Re-checking protected endpoint after restart: $PROTECTED_USED"
  status_after=$(curl -sS -b "$COOKIE_JAR" -o /tmp/audit_protected_after.json -w "%{http_code}" --max-time $TIMEOUT_CURL "$PROTECTED_USED" || true)
  echo "   HTTP $status_after"
  if [ -s /tmp/audit_protected_after.json ]; then
    cat /tmp/audit_protected_after.json | jq -C . || cat /tmp/audit_protected_after.json
  fi
  if [ "$status_after" = "200" ]; then
    echo "  Session persisted across restart ✅"
  else
    echo "  Session did not persist after restart. Check Redis session store, cookie flags, and server logs."
  fi
else
  echo "  Skipping post-restart session check because no protected endpoint was successfully used earlier."
fi
echo

# 4) Redis checks (if redis-cli is available)
echo "-> 6) Redis quick checks (if redis-cli available and REDIS_URL known)"
if command -v redis-cli >/dev/null 2>&1 && [ -n "${REDIS_URL:-}" ]; then
  echo "  redis-cli ping ->"
  if redis-cli -u "$REDIS_URL" ping; then
    echo "  PONG"
  else
    echo "  Redis ping failed. Check REDIS_URL and network access."
  fi

  echo "  Count session keys (pattern sess:*)"
  # Use --scan for large keyspaces
  cnt=$(redis-cli -u "$REDIS_URL" --scan --pattern "sess:*" | wc -l || true)
  echo "  sess:* keys count ~= $cnt"
else
  echo "  redis-cli not installed or REDIS_URL not provided. Skipping Redis checks."
fi
echo

# 5) Mongo checks (optional)
echo "-> 7) Mongo quick checks (if mongosh/mongo available and MONGO_URI known)"
if command -v mongosh >/dev/null 2>&1 && [ -n "${MONGO_URI:-}" ]; then
  echo "  Running basic db.stats() via mongosh"
  mongosh "$MONGO_URI" --eval "db.stats()" || echo "  mongosh query failed"
elif command -v mongo >/dev/null 2>&1 && [ -n "${MONGO_URI:-}" ]; then
  echo "  Running basic db.stats() via mongo"
  mongo "$MONGO_URI" --eval "db.stats()" || echo "  mongo query failed"
else
  echo "  mongosh/mongo not installed or MONGO_URI not provided. Skipping Mongo checks."
fi
echo

# 6) Session-debug route (optional)
echo "-> 8) Session-debug route (optional)"
if curl -sS -I --max-time $TIMEOUT_CURL "$HOST$SESSION_DEBUG_ROUTE" 2>/dev/null | head -n1 | grep -q '200\|401\|403\|404'; then
  echo "  $SESSION_DEBUG_ROUTE exists — fetching (with cookie)"
  curl -sS -b "$COOKIE_JAR" "$HOST$SESSION_DEBUG_ROUTE" | jq -C . || curl -sS -b "$COOKIE_JAR" "$HOST$SESSION_DEBUG_ROUTE"
else
  echo "  $SESSION_DEBUG_ROUTE not available or no response — skip"
fi
echo

# 7) Basic security headers check
echo "-> 9) Security headers check (via /)"
echo "  Response headers:"
curl -sS -I --max-time $TIMEOUT_CURL "$HOST" | sed -n '1,120p'
echo

# Final summary
echo "==== Audit finished ===="
echo "Summary hints:"
echo " - If sessions persist across restart -> Redis-backed sessions OK."
echo " - If login didn't return cookie -> verify /api/v1/auth/login and credentials."
echo " - If Redis checks failed -> check REDIS_URL and network access (VPC/firewall)."
echo " - If Mongo checks failed -> check MONGO_URI, Atlas IP whitelist and credentials."
echo
echo "Cookie file: $COOKIE_JAR"
echo "You can re-run with custom env vars, e.g.:"
echo "  HOST=http://localhost:8080 TEST_EMAIL=you@x.com TEST_PASSWORD=pass REDIS_URL=redis://... ./audit-smoke.sh"
echo
