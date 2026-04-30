// Tier-A tables (carry `brand_id` directly). See docs/BRAND_SCOPING.md.
// Used by scripts/check-brand-filter.sh to flag reads/writes that omit
// `.eq("brand_id", …)`.
//
// When you add a Tier-A table, add it here AND keep
// scripts/check-brand-filter.sh in sync.
export const TIER_A_TABLES = [
	"billing_settings",
	"brand_config_items",
	"brand_settings",
	"customer_wallets",
	"customers",
	"employees",
	"inventory_items",
	"outlets",
	"passcodes",
	"payment_methods",
	"services",
	"taxes",
] as const;

export type TierATable = (typeof TIER_A_TABLES)[number];
