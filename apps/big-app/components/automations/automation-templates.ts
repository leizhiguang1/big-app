import type { Automation } from "@aimbig/wa-client";

export type WorkflowTemplate = {
	icon: string;
	title: string;
	desc: string;
	workflow: Omit<Automation, "id" | "createdAt" | "updatedAt">;
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
	{
		icon: "🦷",
		title: "Confirm / Cancel Reply Tagger",
		desc: "When a customer replies CONFIRM or CANCEL to a reminder, tag them so the team can follow up.",
		workflow: {
			name: "Confirm/Cancel Reply Tagger",
			enabled: true,
			trigger: { type: "keyword_match", keywords: ["CONFIRM", "CANCEL"] },
			actions: [
				{ type: "add_tag", tag: "RSVP Received" },
				{
					type: "add_note",
					note: "Customer responded to appointment reminder.",
				},
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: true,
				stopOnResponse: false,
			},
		},
	},
	{
		icon: "👋",
		title: "New Customer Welcome",
		desc: "When a new contact sends their first message, send a friendly welcome and tag them.",
		workflow: {
			name: "New Customer Welcome",
			enabled: true,
			trigger: { type: "new_contact" },
			actions: [
				{
					type: "send_message",
					message:
						"Hi there! 👋 Thanks for reaching out. Reply with what you need and we'll get right back to you.",
				},
				{ type: "add_tag", tag: "New Lead" },
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: false,
				stopOnResponse: true,
			},
		},
	},
	{
		icon: "🛑",
		title: "Opt-out Handler",
		desc: "When a customer replies STOP, enable Do Not Disturb and confirm.",
		workflow: {
			name: "Opt-out (STOP) Handler",
			enabled: true,
			trigger: { type: "keyword_match", keywords: ["STOP", "UNSUBSCRIBE"] },
			actions: [
				{ type: "enable_dnd" },
				{ type: "add_tag", tag: "Opted Out" },
				{
					type: "add_note",
					note: "Customer opted out of automated messages.",
				},
				{
					type: "send_message",
					message:
						"You've been unsubscribed from automated messages. Reply START anytime to re-subscribe.",
				},
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: false,
				stopOnResponse: false,
			},
		},
	},
	{
		icon: "📅",
		title: "Booking Confirmation",
		desc: "When an appointment is booked, instantly send the customer a confirmation with the date & time.",
		workflow: {
			name: "Appointment Booking Confirmation",
			enabled: true,
			trigger: { type: "appointment_booked" },
			actions: [
				{
					type: "send_message",
					message:
						"Hi {{customer_name}}! ✅ Your appointment is confirmed for {{appointment_date}} at {{appointment_time}} with {{employee_name}}. See you soon!",
				},
				{ type: "add_tag", tag: "Appointment" },
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: true,
				stopOnResponse: false,
			},
		},
	},
	{
		icon: "🌟",
		title: "Post-Visit Review Request",
		desc: "One day after appointment completion, ask the customer for a review.",
		workflow: {
			name: "Post-Visit Review Request",
			enabled: false,
			trigger: { type: "appointment_completed" },
			actions: [
				{ type: "wait", duration: 1, unit: "days" },
				{
					type: "send_message",
					message:
						"Hi {{customer_name}}, thank you for your visit! We'd love your feedback — please leave us a quick review. 🙏",
				},
				{ type: "add_tag", tag: "Review Requested" },
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: true,
				stopOnResponse: true,
			},
		},
	},
	{
		icon: "🎂",
		title: "Birthday Greeting",
		desc: "On the customer's birthday, send a warm greeting and a special offer.",
		workflow: {
			name: "Birthday Greeting",
			enabled: false,
			trigger: { type: "birthday_reminder" },
			actions: [
				{
					type: "send_message",
					message:
						"🎂 Happy Birthday, {{customer_name}}! Wishing you a wonderful day. Enjoy a special treat at your next visit — just mention this message!",
				},
				{ type: "add_tag", tag: "Birthday Sent" },
			],
			settings: {
				timezone: "Asia/Kuala_Lumpur",
				allowReEnrollment: false,
				stopOnResponse: false,
			},
		},
	},
];
