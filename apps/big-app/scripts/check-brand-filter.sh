#!/usr/bin/env bash
# Flags any Tier-A `.from("<table>")` call without a sibling
# `.eq("brand_id", …)` (or `// brand-filter:exempt` annotation) within a
# 30-line window after the call. See docs/BRAND_SCOPING.md.
#
# Source of truth for the table list: apps/big-app/lib/brand-id-tables.ts.
# Keep these two files in sync when adding a new Tier-A table.
set -euo pipefail

# MUST MATCH lib/brand-id-tables.ts -> TIER_A_TABLES.
TABLES=(
	"billing_settings"
	"brand_config_items"
	"brand_settings"
	"customer_wallets"
	"customers"
	"employees"
	"inventory_items"
	"outlets"
	"passcodes"
	"payment_methods"
	"services"
	"taxes"
)

# Resolve to apps/big-app no matter where this is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SCAN_DIRS=(
	"${APP_DIR}/lib/services"
	"${APP_DIR}/lib/actions"
	"${APP_DIR}/app"
)

WINDOW_AFTER=30
# 12 is wide enough to catch payload consts built immediately before
# `.from(...).insert(payload)` (e.g. employees.ts), but not so wide that
# unrelated TS type declarations earlier in the file get matched.
WINDOW_BEFORE=12
EXIT=0
MISSING=()

for table in "${TABLES[@]}"; do
	# Match .from("<table>") and .from('<table>'). grep -n gives "file:line:content".
	while IFS= read -r match; do
		[ -z "${match}" ] && continue
		file="${match%%:*}"
		rest="${match#*:}"
		line="${rest%%:*}"

		# Window covers WINDOW_BEFORE lines above (catches payloads defined
		# before .from(...).insert(payload)) and WINDOW_AFTER lines below
		# (catches chained .eq() filters).
		start=$((line > WINDOW_BEFORE ? line - WINDOW_BEFORE : 1))
		end=$((line + WINDOW_AFTER))
		snippet=$(sed -n "${start},${end}p" "$file")

		# Pass if any of the following appears in the window:
		#   .eq("brand_id", …)           — select / update / delete filter
		#   brand_id: <expr>             — insert / upsert payload key
		#   // brand-filter:exempt …     — explicit exemption comment
		if echo "$snippet" | grep -qE '\.eq\(["'\'']brand_id["'\'']|brand_id:\s*[a-zA-Z]'; then
			continue
		fi
		if echo "$snippet" | grep -qE 'brand-filter:exempt'; then
			continue
		fi

		rel="${file#${APP_DIR}/}"
		MISSING+=("${rel}:${line}  .from(\"${table}\")")
		EXIT=1
	done < <(grep -rnE "\.from\([\"']${table}[\"']\)" "${SCAN_DIRS[@]}" 2>/dev/null || true)
done

if [ "$EXIT" -ne 0 ]; then
	echo "Tier-A reads missing brand-id filter:"
	echo
	for m in "${MISSING[@]}"; do
		echo "  ${m}"
	done
	echo
	echo "Fix by adding .eq(\"brand_id\", assertBrandId(ctx)) to the query,"
	echo "or annotate with // brand-filter:exempt — <reason> if cross-brand"
	echo "access is intentional (login, platform admin, etc.)."
	exit 1
fi

echo "✓ All Tier-A reads carry a brand_id filter (or are explicitly exempt)."
