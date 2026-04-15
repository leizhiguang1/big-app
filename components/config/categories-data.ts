import {
	Bell,
	Blocks,
	CalendarCheck,
	Code2,
	LayoutDashboard,
	type LucideIcon,
	Package,
	Percent,
	Receipt,
	Settings,
	Sparkles,
	Stethoscope,
	Store,
	UploadCloud,
	UserCog,
	Users,
} from "lucide-react";

export type CategorySection = {
	key: string;
	label: string;
	implemented?: boolean;
};

export type ConfigCategory = {
	slug: string;
	title: string;
	icon: LucideIcon;
	color: CategoryColor;
	sections: CategorySection[];
	/**
	 * When true, the category has its own static route under /config/<slug>
	 * (e.g. outlets, taxes). The /config/[slug] dynamic stub returns notFound
	 * for these so the static route handles rendering.
	 */
	external?: boolean;
};

export type CategoryColor =
	| "sky"
	| "pink"
	| "amber"
	| "violet"
	| "orange"
	| "teal"
	| "yellow"
	| "blue"
	| "emerald"
	| "green"
	| "rose"
	| "red"
	| "fuchsia"
	| "indigo"
	| "cyan";

export const CATEGORY_COLOR_CLASSES: Record<CategoryColor, string> = {
	sky: "bg-sky-100 text-sky-600",
	pink: "bg-pink-100 text-pink-600",
	amber: "bg-amber-100 text-amber-600",
	violet: "bg-violet-100 text-violet-600",
	orange: "bg-orange-100 text-orange-600",
	teal: "bg-teal-100 text-teal-600",
	yellow: "bg-yellow-100 text-yellow-700",
	blue: "bg-blue-100 text-blue-600",
	emerald: "bg-emerald-100 text-emerald-600",
	green: "bg-green-100 text-green-600",
	rose: "bg-rose-100 text-rose-600",
	red: "bg-red-100 text-red-600",
	fuchsia: "bg-fuchsia-100 text-fuchsia-600",
	indigo: "bg-indigo-100 text-indigo-600",
	cyan: "bg-cyan-100 text-cyan-600",
};

export const CATEGORIES: ConfigCategory[] = [
	{
		slug: "general",
		title: "General",
		icon: Settings,
		color: "sky",
		sections: [
			{ key: "general", label: "General" },
			{ key: "timezone", label: "Timezone" },
			{ key: "remarks", label: "Remarks" },
			{ key: "salutation", label: "Salutation" },
			{ key: "security", label: "Security" },
		],
	},
	{
		slug: "dashboard",
		title: "Dashboard",
		icon: LayoutDashboard,
		color: "pink",
		sections: [{ key: "display", label: "Display" }],
	},
	{
		slug: "appointments",
		title: "Appointments",
		icon: CalendarCheck,
		color: "amber",
		sections: [
			{ key: "settings", label: "Appointment Settings" },
			{ key: "online-booking", label: "Online Booking" },
			{ key: "appointment-tag", label: "Appointment Tag" },
			{ key: "queue-display", label: "Queue Display" },
		],
	},
	{
		slug: "customers",
		title: "Customers",
		icon: Users,
		color: "violet",
		sections: [
			{ key: "general", label: "General" },
			{ key: "leads", label: "Leads" },
			{ key: "security", label: "Security" },
		],
	},
	{
		slug: "sales",
		title: "Sales",
		icon: Receipt,
		color: "orange",
		sections: [
			{ key: "discounts", label: "Discounts" },
			{ key: "billing", label: "Billing" },
			{ key: "payment", label: "Payment" },
		],
	},
	{
		slug: "services",
		title: "Services",
		icon: Sparkles,
		color: "teal",
		sections: [
			{ key: "receipt", label: "Service Receipt" },
			{ key: "category", label: "Category" },
		],
	},
	{
		slug: "inventory",
		title: "Inventory",
		icon: Package,
		color: "yellow",
		sections: [
			{ key: "redemption", label: "Product Redemption" },
			{ key: "barcode-scanning", label: "Barcode Scanning" },
			{ key: "locations", label: "Locations" },
			{ key: "others", label: "Others" },
		],
	},
	{
		slug: "employees",
		title: "Employees",
		icon: UserCog,
		color: "blue",
		sections: [
			{ key: "profile", label: "Profile" },
			{ key: "security", label: "Security" },
		],
	},
	{
		slug: "outlets",
		title: "Outlets",
		icon: Store,
		color: "emerald",
		sections: [
			{ key: "daily-summary-email", label: "Daily Summary Email" },
			{ key: "listing", label: "Outlets Listing", implemented: true },
			{ key: "print-type", label: "Print Type" },
			{ key: "security", label: "Security" },
		],
		external: true,
	},
	{
		slug: "taxes",
		title: "Taxes",
		icon: Percent,
		color: "green",
		sections: [{ key: "taxes", label: "Tax Rates", implemented: true }],
		external: true,
	},
	{
		slug: "notifications",
		title: "Notifications",
		icon: Bell,
		color: "rose",
		sections: [
			{ key: "email", label: "E-Mail Settings" },
			{ key: "message", label: "Message Settings" },
			{ key: "whatsapp", label: "WhatsApp Settings" },
			{ key: "line", label: "LINE Settings" },
		],
	},
	{
		slug: "clinical",
		title: "Clinical Features",
		icon: Stethoscope,
		color: "red",
		sections: [
			{ key: "case-note", label: "Case Note" },
			{ key: "coverage-payors", label: "Coverage Payors" },
			{ key: "customer-tracking", label: "Customer Tracking" },
			{ key: "dental-charting", label: "Dental Charting" },
			{ key: "e-document", label: "E-Document" },
			{ key: "lab-management", label: "Lab Management" },
			{ key: "medical-certification", label: "Medical Certification" },
			{ key: "medication", label: "Medication" },
		],
	},
	{
		slug: "migration",
		title: "Migration",
		icon: UploadCloud,
		color: "fuchsia",
		sections: [
			{ key: "step-1-employees", label: "Step 1 — Employees" },
			{ key: "step-2-inventory", label: "Step 2 — Inventory" },
			{ key: "step-3-services", label: "Step 3 — Services" },
			{ key: "step-4-customers", label: "Step 4 — Customers" },
			{ key: "step-5-past-data", label: "Step 5 — Past Data" },
			{ key: "step-6-clinical", label: "Step 6 — Clinical Features" },
			{ key: "step-7-tpa", label: "Step 7 — Third Party Admin" },
		],
	},
	{
		slug: "api",
		title: "API",
		icon: Code2,
		color: "indigo",
		sections: [{ key: "reference", label: "API Reference" }],
	},
	{
		slug: "integrations",
		title: "Integrations & Add-ons",
		icon: Blocks,
		color: "cyan",
		sections: [{ key: "apps", label: "Apps" }],
	},
];

export function findCategory(slug: string): ConfigCategory | undefined {
	return CATEGORIES.find((category) => category.slug === slug);
}

export function resolveSection(
	category: ConfigCategory,
	sectionKey: string | undefined,
): CategorySection {
	return (
		category.sections.find((s) => s.key === sectionKey) ?? category.sections[0]
	);
}
