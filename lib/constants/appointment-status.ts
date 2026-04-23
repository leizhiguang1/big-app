import {
	Check,
	CircleDollarSign,
	HelpCircle,
	type LucideIcon,
	Play,
	ThumbsUp,
	UserCheck,
	UserX,
} from "lucide-react";

export const APPOINTMENT_STATUSES = [
	"pending",
	"confirmed",
	"arrived",
	"started",
	"noshow",
	"billing",
	"completed",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export type AppointmentStatusConfig = {
	label: string;
	Icon: LucideIcon;
	// Tailwind utility classes — easy to swap; mirror prototype palette intent.
	border: string;
	badge: string;
	dot: string;
	text: string;
	// Solid hex used by the hover popup header + arrow, where Tailwind classes
	// can't carry through inline styles.
	solidHex: string;
};

export const APPOINTMENT_STATUS_CONFIG: Record<
	AppointmentStatus,
	AppointmentStatusConfig
> = {
	pending: {
		label: "Pending",
		Icon: HelpCircle,
		border: "border-blue-300",
		badge: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
		dot: "bg-blue-400",
		text: "text-blue-800",
		solidHex: "#60a5fa",
	},
	confirmed: {
		label: "Confirmed",
		Icon: ThumbsUp,
		border: "border-blue-600",
		badge: "bg-blue-100 text-blue-800 ring-1 ring-blue-300",
		dot: "bg-blue-600",
		text: "text-blue-800",
		solidHex: "#2563eb",
	},
	arrived: {
		label: "Arrived",
		Icon: UserCheck,
		border: "border-yellow-500",
		badge: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300",
		dot: "bg-yellow-500",
		text: "text-yellow-800",
		solidHex: "#eab308",
	},
	started: {
		label: "Started",
		Icon: Play,
		border: "border-green-400",
		badge: "bg-green-100 text-green-800 ring-1 ring-green-300",
		dot: "bg-green-500",
		text: "text-green-800",
		solidHex: "#22c55e",
	},
	noshow: {
		label: "No Show",
		Icon: UserX,
		border: "border-red-500",
		badge: "bg-red-100 text-red-700 ring-1 ring-red-300",
		dot: "bg-red-500",
		text: "text-red-700",
		solidHex: "#ef4444",
	},
	billing: {
		label: "Ready to Billing",
		Icon: CircleDollarSign,
		border: "border-teal-500",
		badge: "bg-teal-100 text-teal-800 ring-1 ring-teal-300",
		dot: "bg-teal-500",
		text: "text-teal-800",
		solidHex: "#14b8a6",
	},
	completed: {
		label: "Completed",
		Icon: Check,
		border: "border-gray-400",
		badge: "bg-gray-100 text-gray-700 ring-1 ring-gray-300",
		dot: "bg-gray-400",
		text: "text-gray-700",
		solidHex: "#9ca3af",
	},
};

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
	unpaid: "Unpaid",
	partial: "Partial",
	paid: "Paid",
};

export type PaymentStatusConfig = {
	label: string;
	badge: string;
	dot: string;
	solidHex: string;
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, PaymentStatusConfig> =
	{
		paid: {
			label: "Paid",
			badge: "bg-emerald-100 text-emerald-700",
			dot: "bg-emerald-500",
			solidHex: "#10b981",
		},
		partial: {
			label: "Partial",
			badge: "bg-yellow-100 text-yellow-700",
			dot: "bg-yellow-500",
			solidHex: "#eab308",
		},
		unpaid: {
			label: "Unpaid",
			badge: "bg-red-100 text-red-700",
			dot: "bg-red-500",
			solidHex: "#ef4444",
		},
	};

export const APPOINTMENT_PAYMENT_MODES = [
	"cash",
	"credit_card",
	"debit_card",
	"online_transfer",
	"e_wallet",
] as const;
export type AppointmentPaymentMode = (typeof APPOINTMENT_PAYMENT_MODES)[number];

export const APPOINTMENT_PAYMENT_MODE_LABEL: Record<
	AppointmentPaymentMode,
	string
> = {
	cash: "Cash",
	credit_card: "Credit Card",
	debit_card: "Debit Card",
	online_transfer: "Online Transfer",
	e_wallet: "E-Wallet",
};

// Configurable tag palette — uses hex so colors can be edited per-clinic later.
export type AppointmentTagConfig = { label: string; bg: string; dot: string };

export const APPOINTMENT_TAG_CONFIG: Record<string, AppointmentTagConfig> = {
	CROWN: { label: "Crown", bg: "#fed7aa", dot: "#ea580c" },
	DENTURE: { label: "Denture", bg: "#c4b5fd", dot: "#6d28d9" },
	"EXTRACTION/MOS": {
		label: "Extraction / MOS",
		bg: "#fecaca",
		dot: "#dc2626",
	},
	FILLING: { label: "Filling", bg: "#fbcfe8", dot: "#db2777" },
	ORTHODONTICS: { label: "Orthodontics", bg: "#a5f3fc", dot: "#0891b2" },
	IMPLANT: { label: "Implant", bg: "#ede9fe", dot: "#a78bfa" },
	SCALING: { label: "Scaling", bg: "#fde68a", dot: "#a16207" },
};

export const APPOINTMENT_TAG_KEYS = Object.keys(APPOINTMENT_TAG_CONFIG);
