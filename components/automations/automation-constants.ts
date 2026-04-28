// Trigger and action catalogues — mirror the archived AutomationPage definitions.
// The wa-crm engine accepts arbitrary keys per action; these tables drive UI only.

export type TriggerCatalog = Record<
	string,
	{ label: string; icon: string; group: string }
>;

export const TRIGGER_TYPES: TriggerCatalog = {
	// Messages
	inbound_message: {
		label: "Inbound Message",
		icon: "📥",
		group: "Messages",
	},
	keyword_match: { label: "Keyword Match", icon: "🔑", group: "Messages" },
	customer_replied: {
		label: "Customer Replied",
		icon: "↩️",
		group: "Messages",
	},
	// Appointments
	appointment_booked: {
		label: "Appointment Booked",
		icon: "📅",
		group: "Appointments",
	},
	appointment_completed: {
		label: "Appointment Completed",
		icon: "✅",
		group: "Appointments",
	},
	appointment_cancelled: {
		label: "Appointment Cancelled",
		icon: "❌",
		group: "Appointments",
	},
	service_booking: {
		label: "Service Booking",
		icon: "🦷",
		group: "Appointments",
	},
	// Contact
	new_contact: { label: "New Contact Created", icon: "👤", group: "Contact" },
	contact_changed: { label: "Contact Changed", icon: "✏️", group: "Contact" },
	contact_tag_added: {
		label: "Tag Added to Contact",
		icon: "🏷️",
		group: "Contact",
	},
	contact_dnd: { label: "Contact DND Changed", icon: "🔕", group: "Contact" },
	note_added: { label: "Note Added", icon: "📝", group: "Contact" },
	// Scheduled
	birthday_reminder: {
		label: "Birthday (Annual)",
		icon: "🎂",
		group: "Scheduled",
	},
	custom_date_reminder: {
		label: "Custom Date Reminder",
		icon: "📆",
		group: "Scheduled",
	},
	scheduler: { label: "Scheduler", icon: "⏰", group: "Scheduled" },
	// Events
	inbound_webhook: {
		label: "Inbound Webhook",
		icon: "🔗",
		group: "Events",
	},
	form_submitted: { label: "Form Submitted", icon: "📋", group: "Events" },
	trigger_link_clicked: {
		label: "Trigger Link Clicked",
		icon: "🖱️",
		group: "Events",
	},
	new_review_received: {
		label: "New Review Received",
		icon: "⭐",
		group: "Events",
	},
	// Payments
	payment_received: {
		label: "Payment Received",
		icon: "💳",
		group: "Payments",
	},
	invoice_event: { label: "Invoice", icon: "🧾", group: "Payments" },
	order_submitted: {
		label: "Order Submitted",
		icon: "🛒",
		group: "Payments",
	},
};

export type ActionCatalog = Record<
	string,
	{ label: string; icon: string; group: string }
>;

export const ACTION_TYPES: ActionCatalog = {
	// Communication
	send_message: {
		label: "Send WhatsApp",
		icon: "💬",
		group: "Communication",
	},
	send_template: {
		label: "Send Template",
		icon: "📋",
		group: "Communication",
	},
	send_email: { label: "Send Email", icon: "📧", group: "Communication" },
	send_internal_notification: {
		label: "Internal Notification",
		icon: "🔔",
		group: "Communication",
	},
	send_to_admin: {
		label: "Send to Admin",
		icon: "📲",
		group: "Communication",
	},
	send_to_group: {
		label: "Send to Group",
		icon: "👥",
		group: "Communication",
	},
	send_review_request: {
		label: "Send Review Request",
		icon: "⭐",
		group: "Communication",
	},
	manual_action: {
		label: "Manual Action",
		icon: "🙋",
		group: "Communication",
	},
	// Contact
	add_tag: { label: "Add Tag", icon: "🏷️", group: "Contact" },
	remove_tag: { label: "Remove Tag", icon: "🚫", group: "Contact" },
	add_note: { label: "Add Note", icon: "📝", group: "Contact" },
	update_field: { label: "Update Field", icon: "✏️", group: "Contact" },
	assign_user: { label: "Assign User", icon: "👤", group: "Contact" },
	remove_user: {
		label: "Remove Assigned User",
		icon: "👋",
		group: "Contact",
	},
	enable_dnd: { label: "Enable DND", icon: "🔕", group: "Contact" },
	disable_dnd: { label: "Disable DND", icon: "🔔", group: "Contact" },
	create_contact: { label: "Create Contact", icon: "➕", group: "Contact" },
	delete_contact: { label: "Delete Contact", icon: "🗑️", group: "Contact" },
	// Flow
	wait: { label: "Wait / Delay", icon: "⏳", group: "Flow" },
	if_else: { label: "If / Else", icon: "⑂", group: "Flow" },
	go_to: { label: "Go To", icon: "↪️", group: "Flow" },
	remove_from_workflow: {
		label: "Remove from Workflow",
		icon: "🚪",
		group: "Flow",
	},
	split: { label: "Split (A/B Test)", icon: "🔀", group: "Flow" },
	// Appointments
	update_appointment_status: {
		label: "Update Appointment Status",
		icon: "📅",
		group: "Appointments",
	},
	generate_booking_link: {
		label: "Generate Booking Link",
		icon: "🔗",
		group: "Appointments",
	},
	// Payments
	send_invoice: { label: "Send Invoice", icon: "🧾", group: "Payments" },
	stripe_charge: {
		label: "Stripe One-Time Charge",
		icon: "💳",
		group: "Payments",
	},
	// Integrations
	post_webhook: { label: "POST Webhook", icon: "🔗", group: "Integrations" },
	google_sheet: {
		label: "Send to Google Sheet",
		icon: "🟢",
		group: "Integrations",
	},
};

export const VAR_TOKENS = [
	"{{name}}",
	"{{phone}}",
	"{{patient_name}}",
	"{{customer_name}}",
	"{{appointment_date}}",
	"{{appointment_time}}",
	"{{service}}",
	"{{dentist}}",
	"{{employee_name}}",
];

export function triggerLabel(trigger?: { type?: string }): string | null {
	if (!trigger?.type) return null;
	return TRIGGER_TYPES[trigger.type]?.label ?? trigger.type;
}

export function triggerSummary(trigger?: {
	type?: string;
	keywords?: unknown;
	frequency?: unknown;
	time?: unknown;
}): string | null {
	if (!trigger?.type) return null;
	const label = TRIGGER_TYPES[trigger.type]?.label ?? trigger.type;
	if (
		trigger.type === "keyword_match" &&
		Array.isArray(trigger.keywords) &&
		trigger.keywords.length > 0
	) {
		return `${label}: ${(trigger.keywords as string[]).slice(0, 3).join(", ")}`;
	}
	if (trigger.type === "scheduler") {
		const parts: string[] = [];
		if (trigger.frequency) parts.push(String(trigger.frequency));
		if (trigger.time) parts.push(String(trigger.time));
		return `${label}${parts.length ? ` · ${parts.join(" @ ")}` : ""}`;
	}
	return label;
}

export function actionLabel(action: { type?: string }): string {
	if (!action?.type) return "Untitled";
	return ACTION_TYPES[action.type]?.label ?? action.type;
}

export function actionIcon(action: { type?: string }): string {
	if (!action?.type) return "•";
	return ACTION_TYPES[action.type]?.icon ?? "•";
}
