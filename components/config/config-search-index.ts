import type { LucideIcon } from "lucide-react";
import {
	CATEGORIES,
	type CategoryColor,
	type ConfigCategory,
} from "./categories-data";

export type ConfigSearchEntry = {
	id: string;
	categorySlug: string;
	categoryTitle: string;
	categoryIcon: LucideIcon;
	categoryColor: CategoryColor;
	sectionKey: string;
	sectionLabel: string;
	href: string;
	implemented: boolean;
	keywords: string;
};

const SECTION_SYNONYMS: Record<string, string[]> = {
	"general/general": ["brand", "company", "name"],
	"general/timezone": ["tz", "time"],
	"general/remarks": ["notes", "default remark"],
	"general/salutation": ["title", "mr", "ms", "mrs", "dr", "prefix"],
	"general/security": ["password", "2fa", "login"],
	"dashboard/display": ["kpi", "widgets", "cards", "home"],
	"appointments/settings": ["slot", "duration", "overbook", "booking"],
	"appointments/online-booking": ["self service", "booking link", "public"],
	"appointments/appointment-tag": ["color", "tag", "label"],
	"appointments/cancel-reasons": ["cancellation", "no show"],
	"appointments/queue-display": ["waiting room", "screen", "tv"],
	"customers/general": ["customer code", "patient"],
	"customers/tags": ["vocabulary", "labels"],
	"customers/leads": ["prospect"],
	"customers/security": ["password", "consent"],
	"sales/discounts": ["discount", "promo", "coupon"],
	"sales/billing": ["tax", "invoice", "billing message", "footer"],
	"sales/void-reasons": ["void", "cancel", "refund"],
	"sales/payment": ["payment methods", "cash", "card", "nets", "paynow"],
	"services/receipt": ["service receipt"],
	"services/category": ["service group"],
	"inventory/redemption": ["package", "voucher"],
	"inventory/barcode-scanning": ["barcode", "scanner"],
	"inventory/locations": ["stock", "storage", "warehouse"],
	"employees/profile": ["staff", "fields", "profile"],
	"employees/security": ["password", "role", "permission"],
	"outlets/listing": ["branch", "clinic", "location"],
	"outlets/daily-summary-email": ["daily", "summary", "email"],
	"outlets/print-type": ["receipt", "print"],
	"taxes/taxes": ["gst", "vat", "tax rate"],
	"notifications/email": ["smtp", "email"],
	"notifications/message": ["sms", "message"],
	"notifications/whatsapp": ["wa", "whatsapp"],
	"notifications/line": ["line"],
	"clinical/case-note": ["clinical", "case note"],
	"clinical/dental-charting": ["clinical", "dental", "chart"],
	"clinical/medical-certification": ["clinical", "mc", "medical certificate"],
	"clinical/medication": ["clinical", "drug", "prescription"],
	"clinical/lab-management": ["clinical", "lab"],
	"clinical/coverage-payors": ["clinical", "insurance", "payor"],
	"clinical/customer-tracking": ["clinical", "tracking"],
	"clinical/e-document": ["clinical", "document"],
	"migration/step-1-employees": ["import", "migrate"],
	"migration/step-2-inventory": ["import", "migrate"],
	"migration/step-3-services": ["import", "migrate"],
	"migration/step-4-customers": ["import", "migrate"],
	"migration/step-5-past-data": ["import", "migrate"],
	"migration/step-6-clinical": ["import", "migrate"],
	"migration/step-7-tpa": ["import", "migrate", "tpa", "third party"],
	"api/reference": ["api", "developer"],
	"integrations/apps": ["addons", "plugins", "marketplace"],
};

function resolveHref(category: ConfigCategory, sectionKey: string): string {
	const section = category.sections.find((s) => s.key === sectionKey);
	if (section?.href) return section.href;
	return `/config/${category.slug}?section=${sectionKey}`;
}

export function buildSearchIndex(): ConfigSearchEntry[] {
	const entries: ConfigSearchEntry[] = [];
	for (const category of CATEGORIES) {
		for (const section of category.sections) {
			const id = `${category.slug}/${section.key}`;
			const synonyms = SECTION_SYNONYMS[id] ?? [];
			entries.push({
				id,
				categorySlug: category.slug,
				categoryTitle: category.title,
				categoryIcon: category.icon,
				categoryColor: category.color,
				sectionKey: section.key,
				sectionLabel: section.label,
				href: resolveHref(category, section.key),
				implemented: section.implemented ?? false,
				keywords: [section.label, category.title, ...synonyms]
					.join(" ")
					.toLowerCase(),
			});
		}
	}
	return entries;
}

export function scoreEntry(entry: ConfigSearchEntry, query: string): number {
	if (!query) return 0;
	const q = query.toLowerCase().trim();
	if (!q) return 0;

	const label = entry.sectionLabel.toLowerCase();
	const cat = entry.categoryTitle.toLowerCase();

	if (label === q) return 1000;
	if (label.startsWith(q)) return 800;
	if (cat === q) return 700;
	if (cat.startsWith(q)) return 600;
	if (label.includes(q)) return 400;
	if (cat.includes(q)) return 300;
	if (entry.keywords.includes(q)) return 200;

	const tokens = q.split(/\s+/).filter(Boolean);
	if (tokens.length > 1 && tokens.every((t) => entry.keywords.includes(t))) {
		return 150;
	}
	return 0;
}

export function filterEntries(
	entries: ConfigSearchEntry[],
	query: string,
): ConfigSearchEntry[] {
	if (!query.trim()) return entries;
	const scored = entries
		.map((entry) => ({ entry, score: scoreEntry(entry, query) }))
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score);
	return scored.map((s) => s.entry);
}
