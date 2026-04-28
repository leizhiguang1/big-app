import { z } from "zod";

// The authoritative registry of shape-2 scalar settings stored in
// `brand_settings`. Each key is a `<group>.<setting>` string; the Zod schema
// both validates writes and narrows the return type of getBrandSetting().
// Adding a new setting is a one-line change here — no migration needed.
// Zero-row => default from this registry.

// The shape of an admin-UI input hint. One component renders each kind.
export type BrandSettingInput =
	| { kind: "boolean" }
	| { kind: "number"; unit?: string; min?: number; max?: number; step?: number }
	| { kind: "string"; placeholder?: string }
	| {
			kind: "enum";
			options: readonly { value: string; label: string }[];
	  };

type SettingDef<T extends z.ZodType> = {
	group: string;
	label: string;
	hint?: string;
	schema: T;
	default: z.infer<T>;
	input: BrandSettingInput;
};

function def<T extends z.ZodType>(d: SettingDef<T>): SettingDef<T> {
	return d;
}

// ── appointments (pilot — admin UI live) ─────────────────────────────────
const appointmentSettings = {
	"appointment.default_slot_minutes": def({
		group: "appointment",
		label: "Default appointment slot (minutes)",
		hint: "Column height on the calendar and default step on the time picker.",
		schema: z.number().int().min(5).max(240),
		default: 30,
		input: { kind: "number", unit: "min", min: 5, max: 240, step: 5 },
	}),
	"appointment.allow_overbook": def({
		group: "appointment",
		label: "Allow overlapping appointments",
		hint: "When on, staff can double-book the same employee; conflicts are soft-warnings only.",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
	"appointment.hide_value_on_hover": def({
		group: "appointment",
		label: "Hide appointment value on mouse-over",
		hint: "Hides the billing amount in the appointment hover card — useful in front-of-house settings.",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
};

// ── registered but UI not wired yet ──────────────────────────────────────
// Each lights up when its owning module exposes it in /config. Having them
// here means defaults exist day one and nothing silently reads undefined.
const registeredSettings = {
	"appointment.booking_lead_hours": def({
		group: "appointment",
		label: "Online booking lead time (hours)",
		schema: z.number().int().min(0).max(720),
		default: 0,
		input: { kind: "number", unit: "hrs", min: 0, max: 720 },
	}),
	"appointment.enable_pin": def({
		group: "appointment",
		label: "Enable PIN for appointments",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
	"appointment.disable_sounds": def({
		group: "appointment",
		label: "Disable sound effects on status change",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
	"security.password_expiry_days": def({
		group: "security",
		label: "Password expiry (days, 0 = disabled)",
		schema: z.number().int().min(0).max(3650),
		default: 0,
		input: { kind: "number", unit: "days", min: 0, max: 3650 },
	}),
	"security.failed_login_limit": def({
		group: "security",
		label: "Failed login attempts limit (0 = disabled)",
		schema: z.number().int().min(0).max(100),
		default: 0,
		input: { kind: "number", min: 0, max: 100 },
	}),
	"billing.show_age_on_invoice": def({
		group: "billing",
		label: "Show customer age on invoice",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
	"billing.staff_discount_percent": def({
		group: "billing",
		label: "Staff discount (%)",
		hint: "Applied to service lines when Collect Payment → Apply Auto Discount is clicked and the customer is flagged as staff. Per-service discount_cap still clamps the result.",
		schema: z.number().min(0).max(100),
		default: 10,
		input: { kind: "number", unit: "%", min: 0, max: 100, step: 0.5 },
	}),
	"customer.require_passcode_to_create": def({
		group: "customer",
		label: "Require passcode to create a customer",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
	"customer.require_passcode_to_view": def({
		group: "customer",
		label: "Require passcode to view a customer",
		schema: z.boolean(),
		default: false,
		input: { kind: "boolean" },
	}),
};

export const BRAND_SETTINGS = {
	...appointmentSettings,
	...registeredSettings,
} as const;

export type BrandSettingKey = keyof typeof BRAND_SETTINGS;

export type BrandSettingValue<K extends BrandSettingKey> = z.infer<
	(typeof BRAND_SETTINGS)[K]["schema"]
>;

export function getSettingDef<K extends BrandSettingKey>(
	key: K,
): (typeof BRAND_SETTINGS)[K] {
	return BRAND_SETTINGS[key];
}

export function isBrandSettingKey(v: string): v is BrandSettingKey {
	return v in BRAND_SETTINGS;
}

// Groups rendered in the admin UI. Keys here are stable; adding a new group
// = adding a string here and at least one setting with that group.
export const BRAND_SETTING_GROUPS: Record<string, { label: string }> = {
	appointment: { label: "Appointments" },
	security: { label: "Security" },
	billing: { label: "Billing" },
	customer: { label: "Customers" },
};

export function getBrandSettingKeysByGroup(group: string): BrandSettingKey[] {
	return (Object.keys(BRAND_SETTINGS) as BrandSettingKey[]).filter(
		(k) => BRAND_SETTINGS[k].group === group,
	);
}
