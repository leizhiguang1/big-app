import { z } from "zod";

export type PermissionSectionKey =
	| "clinical"
	| "appointments"
	| "customers"
	| "sales"
	| "roster"
	| "services"
	| "inventory"
	| "staff"
	| "system";

export type PermissionFlag = { key: string; label: string };
export type PermissionSection = {
	key: PermissionSectionKey;
	label: string;
	flags: readonly PermissionFlag[];
};

export const PERMISSION_SECTIONS = [
	{
		key: "clinical",
		label: "Clinical",
		flags: [
			{ key: "case_notes", label: "Case notes" },
			{ key: "case_notes_edit", label: "Case notes — edit" },
			{ key: "case_notes_billing", label: "Case notes — billing" },
			{ key: "medical_certificates", label: "Medical certificates & letters" },
			{ key: "prescriptions", label: "Prescriptions" },
			{ key: "document_edit", label: "Document — edit" },
			{ key: "document_delete", label: "Document — delete" },
		],
	},
	{
		key: "appointments",
		label: "Appointments",
		flags: [
			{ key: "appointments", label: "Appointments" },
			{ key: "customer_transparency", label: "Customer transparency" },
			{ key: "consumable_selection", label: "Consumable selection" },
			{ key: "view_all_appointments", label: "View all appointments" },
			{ key: "lead_list_creation", label: "Lead list creation" },
			{ key: "revert_appointment", label: "Revert appointment" },
			{ key: "queue", label: "Queue" },
			{ key: "appointment_approval", label: "Appointment approval" },
			{ key: "customer_contact_email", label: "Customer contact & email" },
		],
	},
	{
		key: "customers",
		label: "Customers",
		flags: [
			{ key: "customers", label: "Customers" },
			{ key: "view", label: "View" },
			{ key: "update", label: "Update" },
			{ key: "internal_review", label: "Internal review" },
			{ key: "review_assignment", label: "Review assignment" },
			{ key: "customer_transparency", label: "Customer transparency" },
			{ key: "customer_merging", label: "Customer merging" },
			{ key: "revert_products", label: "Revert products" },
			{ key: "customers_contact", label: "Customers contact" },
		],
	},
	{
		key: "sales",
		label: "Sales",
		flags: [
			{ key: "sales", label: "Sales" },
			{ key: "customer_transparency", label: "Customer transparency" },
			{ key: "create_sales", label: "Create sales" },
			{ key: "adjust_co_payment", label: "Adjust co-payment" },
			{ key: "sales_person_reallocation", label: "Salesperson reallocation" },
			{ key: "backdate_transactions", label: "Backdate transactions" },
			{ key: "view_petty_cash", label: "View petty cash" },
			{ key: "edit_petty_cash", label: "Edit petty cash" },
		],
	},
	{
		key: "roster",
		label: "Roster",
		flags: [
			{ key: "roster", label: "Roster" },
			{ key: "roster_edit", label: "Roster — edit" },
		],
	},
	{
		key: "services",
		label: "Services",
		flags: [{ key: "services", label: "Services" }],
	},
	{
		key: "inventory",
		label: "Inventory",
		flags: [
			{ key: "inventory", label: "Inventory" },
			{ key: "purchase_orders", label: "Purchase orders" },
			{ key: "returned_stock", label: "Returned stock" },
			{ key: "inventory_edit", label: "Inventory — edit" },
			{ key: "inventory_cost", label: "Inventory — cost" },
			{ key: "adjust_stock", label: "Adjust stock" },
		],
	},
	{
		key: "staff",
		label: "Staff",
		flags: [
			{ key: "employees", label: "Employees" },
			{ key: "roles", label: "Roles" },
			{ key: "position", label: "Position" },
			{ key: "commissions", label: "Commissions" },
			{ key: "employee_listing", label: "Employee listing" },
		],
	},
	{
		key: "system",
		label: "System",
		flags: [
			{ key: "passcode", label: "Passcode" },
			{ key: "reports", label: "Reports" },
			{ key: "config", label: "Config" },
			{ key: "manual_transaction", label: "Manual transaction" },
			{ key: "webstore", label: "Webstore" },
		],
	},
] as const satisfies readonly PermissionSection[];

export const TOTAL_PERMISSION_FLAGS = PERMISSION_SECTIONS.reduce(
	(n, s) => n + s.flags.length,
	0,
);

const sectionShape = (section: PermissionSection) =>
	z.object(
		Object.fromEntries(
			section.flags.map((f) => [f.key, z.boolean()] as const),
		) as Record<string, z.ZodBoolean>,
	);

export const permissionsSchema = z.object({
	all: z.boolean(),
	clinical: sectionShape(PERMISSION_SECTIONS[0]),
	appointments: sectionShape(PERMISSION_SECTIONS[1]),
	customers: sectionShape(PERMISSION_SECTIONS[2]),
	sales: sectionShape(PERMISSION_SECTIONS[3]),
	roster: sectionShape(PERMISSION_SECTIONS[4]),
	services: sectionShape(PERMISSION_SECTIONS[5]),
	inventory: sectionShape(PERMISSION_SECTIONS[6]),
	staff: sectionShape(PERMISSION_SECTIONS[7]),
	system: sectionShape(PERMISSION_SECTIONS[8]),
});

export type RolePermissions = z.infer<typeof permissionsSchema>;

function emptySection(section: PermissionSection): Record<string, boolean> {
	return Object.fromEntries(section.flags.map((f) => [f.key, false]));
}

export function emptyPermissions(): RolePermissions {
	const base: Record<string, unknown> = { all: false };
	for (const section of PERMISSION_SECTIONS) {
		base[section.key] = emptySection(section);
	}
	return base as RolePermissions;
}

export function countEnabledFlags(p: RolePermissions): number {
	if (p.all) return TOTAL_PERMISSION_FLAGS;
	let n = 0;
	for (const section of PERMISSION_SECTIONS) {
		const bucket = p[section.key] as Record<string, boolean>;
		for (const flag of section.flags) if (bucket[flag.key]) n++;
	}
	return n;
}

export function normalizePermissions(raw: unknown): RolePermissions {
	const base = emptyPermissions();
	if (!raw || typeof raw !== "object") return base;
	const src = raw as Record<string, unknown>;
	const merged: Record<string, unknown> = {
		all: typeof src.all === "boolean" ? src.all : false,
	};
	for (const section of PERMISSION_SECTIONS) {
		const existing = (src[section.key] as Record<string, boolean>) ?? {};
		merged[section.key] = {
			...(base[section.key] as Record<string, boolean>),
			...existing,
		};
	}
	const parsed = permissionsSchema.safeParse(merged);
	return parsed.success ? parsed.data : base;
}
