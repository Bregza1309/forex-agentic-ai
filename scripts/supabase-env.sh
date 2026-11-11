#!/usr/bin/env bash
# Reads live Supabase keys from `supabase status` and prints export statements
# that the Makefile evals into the compose environment.
set -euo pipefail

ANON_KEY=$(supabase status --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['ANON_KEY'])" 2>/dev/null || echo "")
SERVICE_ROLE_KEY=$(supabase status --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])" 2>/dev/null || echo "")

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "# Warning: could not read Supabase keys — using .env defaults" >&2
  exit 0
fi

echo "export SUPABASE_ANON_KEY='${ANON_KEY}'"
echo "export SUPABASE_SERVICE_ROLE_KEY='${SERVICE_ROLE_KEY}'"
echo "export VITE_SUPABASE_ANON_KEY='${ANON_KEY}'"
