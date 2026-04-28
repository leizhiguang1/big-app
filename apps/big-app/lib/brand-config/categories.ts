// The authoritative registry of shape-1 categories stored in
// `brand_config_items`. Adding a new list-type configurable is a one-line
// change here — no migration needed. See docs/modules/12-config.md for
// the full tier register across all configurable surfaces.
//
// Rule of thumb: categories here are **brand-editable business vocabulary**
// (reasons, tag sets, picklists). App-UI concerns (status codes, their
// labels + colors + icons, payment-status visuals) are NOT here — they
// stay hardcoded in `lib/constants/` so every brand reads the same visual
// language.

export type BrandConfigCategoryDef = {
	label: string;
	// Singular form used in the create/edit dialog title and the input label
	// (e.g. "Cancel reason" so the dialog reads "New cancel reason"). Falls
	// back to `label` if not set.
	singularLabel?: string;
	// True = brand can add/remove codes freely.
	codeEditable: boolean;
	// Color support (shown as swatch in admin UI and passed through to
	// transactional renders). Categories without color leave the column null.
	hasColor: boolean;
	// Human-readable hint under the section header in the admin page.
	hint?: string;
	// How the chosen label is stored on dependent rows.
	//
	// - "live": dependent columns hold the current label; renaming the item
	//   cascades the new label across history. Use for current-state /
	//   display attributes (salutation, language, religion, current tag set).
	//   The brand says "from now on we address Ms as Miss" → every customer
	//   updates.
	//
	// - "snapshot": dependent columns hold the label that was current at
	//   write-time; renaming does not touch history. Use for historical
	//   facts (cancel reason, void reason, customer source — captured at
	//   that moment). Renaming "Customer changed mind" → "Customer
	//   reconsidered" must NOT silently rewrite the audit trail.
	//
	// Cascade for live categories is implemented in
	// lib/services/brand-config.ts (cascadeLiveRename).
	storage: "live" | "snapshot";
};

export const BRAND_CONFIG_CATEGORIES = {
	// ── promoted (admin UI live) ──────────────────────────────────────────
	void_reason: {
		label: "Void / cancel reasons",
		codeEditable: true,
		hasColor: false,
		hint: "Reasons shown in the Void Sales Order flow.",
		storage: "snapshot",
	},
	appointment_tag: {
		label: "Appointment tags",
		codeEditable: true,
		hasColor: true,
		hint: "Color-coded tags shown on appointment cards and the calendar.",
		storage: "live",
	},
	customer_tag: {
		label: "Customer tag vocabulary",
		codeEditable: true,
		hasColor: true,
		hint: "Suggested tags for the customer profile. Free-text entries are still accepted.",
		storage: "live",
	},
	salutation: {
		label: "Salutations",
		codeEditable: true,
		hasColor: false,
		hint: "How customers and employees are addressed (Mr, Ms, Datuk, Encik…). Renames apply to all existing records.",
		storage: "live",
	},

	// ── registered but UI not wired yet ───────────────────────────────────
	// Each one lights up when its owning module migrates its hardcoded
	// usage to read from brand_config_items.
	customer_language: {
		label: "Languages",
		codeEditable: true,
		hasColor: false,
		storage: "live",
	},
	customer_race: {
		label: "Races",
		codeEditable: true,
		hasColor: false,
		storage: "live",
	},
	customer_religion: {
		label: "Religions",
		codeEditable: true,
		hasColor: false,
		storage: "live",
	},
	customer_occupation: {
		label: "Occupations",
		codeEditable: true,
		hasColor: false,
		storage: "live",
	},
	customer_source: {
		label: "Customer sources",
		codeEditable: true,
		hasColor: false,
		storage: "snapshot",
	},
	customer_reminder_method: {
		label: "Reminder methods",
		codeEditable: true,
		hasColor: false,
		storage: "live",
	},
	"reason.stock_add": {
		label: "Stock-add reasons",
		codeEditable: true,
		hasColor: false,
		storage: "snapshot",
	},
	"reason.stock_reduce": {
		label: "Stock-reduce reasons",
		codeEditable: true,
		hasColor: false,
		storage: "snapshot",
	},
	"reason.appointment_cancel": {
		label: "Appointment cancel reasons",
		singularLabel: "Cancel reason",
		codeEditable: true,
		hasColor: false,
		storage: "snapshot",
	},
} as const satisfies Record<string, BrandConfigCategoryDef>;

export type BrandConfigCategory = keyof typeof BRAND_CONFIG_CATEGORIES;

export function getCategoryDef(
	category: BrandConfigCategory,
): BrandConfigCategoryDef {
	return BRAND_CONFIG_CATEGORIES[category];
}

export function isBrandConfigCategory(v: string): v is BrandConfigCategory {
	return v in BRAND_CONFIG_CATEGORIES;
}
