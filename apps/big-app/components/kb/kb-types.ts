export type KBBusinessInfo = {
	name: string;
	address: string;
	phone: string;
	email: string;
	website: string;
	hours: string;
	panels: string;
	paymentMethods: string;
	parking: string;
};

export type KBService = {
	id: string;
	name: string;
	code: string;
	price: string;
	duration: string;
	fromDB?: boolean;
};

export type KBFaq = {
	id: string;
	question: string;
	answer: string;
};

export type StructuredKB = {
	businessInfo: KBBusinessInfo;
	services: KBService[];
	faqs: KBFaq[];
	policies: string;
};

export const DEFAULT_KB: StructuredKB = {
	businessInfo: {
		name: "Your Business",
		address: "",
		phone: "",
		email: "",
		website: "",
		hours: "Mon–Fri: 9:00 AM – 6:00 PM\nSat: 9:00 AM – 2:00 PM\nSun: Closed",
		panels: "",
		paymentMethods: "Cash, card, online transfer",
		parking: "",
	},
	services: [],
	faqs: [
		{
			id: "f1",
			question: "How do I book an appointment?",
			answer:
				"Reply with your preferred date, time, and the service you need. We'll confirm shortly.",
		},
		{
			id: "f2",
			question: "How do I cancel or reschedule?",
			answer: "Please notify us at least 24 hours in advance via WhatsApp.",
		},
	],
	policies: `## Appointment Policy
- Please arrive 5–10 minutes early
- Cancellations require at least 24 hours notice
- No-shows may be charged a fee

## Payment Policy
- Payment is due at time of service
- Receipts and invoices provided`,
};

export function uid(): string {
	return Math.random().toString(36).slice(2, 9);
}

export function kbToMarkdown(kb: StructuredKB): string {
	const lines: string[] = [];
	const bi = kb.businessInfo;
	lines.push(`# ${bi.name || "Business"}`);
	lines.push("");
	lines.push("## Business Information");
	if (bi.address) lines.push(`- Address: ${bi.address}`);
	if (bi.phone) lines.push(`- Phone: ${bi.phone}`);
	if (bi.email) lines.push(`- Email: ${bi.email}`);
	if (bi.website) lines.push(`- Website: ${bi.website}`);
	if (bi.hours) {
		lines.push("- Hours:");
		bi.hours.split("\n").forEach((l) => lines.push(`  ${l}`));
	}
	if (bi.parking) lines.push(`- Parking: ${bi.parking}`);
	if (bi.panels) lines.push(`- Insurance panels: ${bi.panels}`);
	if (bi.paymentMethods) lines.push(`- Payment: ${bi.paymentMethods}`);

	if (kb.services.length) {
		lines.push("", "## Services & Pricing");
		for (const s of kb.services) {
			lines.push(
				`- ${s.name}: ${s.price}${s.duration ? ` (${s.duration})` : ""}`,
			);
		}
	}

	if (kb.faqs.length) {
		lines.push("", "## Frequently Asked Questions");
		for (const f of kb.faqs) {
			lines.push("");
			lines.push(`Q: ${f.question}`);
			lines.push(`A: ${f.answer}`);
		}
	}

	if (kb.policies?.trim()) {
		lines.push("", "## Policies");
		lines.push(kb.policies.trim());
	}

	return lines.join("\n");
}
