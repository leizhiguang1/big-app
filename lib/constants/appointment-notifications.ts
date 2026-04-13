import type { AppointmentStatus } from "@/lib/constants/appointment-status";

export type StatusSound =
	| "arrived"
	| "started"
	| "billing"
	| "noshow"
	| "completed"
	| null;

export type AppointmentStatusNotification = {
	enabled: boolean;
	sound: StatusSound;
	toastTitle: (customerName: string) => string;
};

export const APPOINTMENT_STATUS_NOTIFICATIONS: Record<
	AppointmentStatus,
	AppointmentStatusNotification
> = {
	pending: {
		enabled: false,
		sound: null,
		toastTitle: (n) => `${n} — pending`,
	},
	confirmed: {
		enabled: false,
		sound: null,
		toastTitle: (n) => `${n} — confirmed`,
	},
	arrived: {
		enabled: true,
		sound: "arrived",
		toastTitle: (n) => `${n} has arrived`,
	},
	started: {
		enabled: true,
		sound: "started",
		toastTitle: (n) => `${n} — treatment started`,
	},
	noshow: {
		enabled: true,
		sound: "noshow",
		toastTitle: (n) => `${n} — no show`,
	},
	billing: {
		enabled: true,
		sound: "billing",
		toastTitle: (n) => `${n} — ready for billing`,
	},
	completed: {
		enabled: true,
		sound: "completed",
		toastTitle: (n) => `${n} — completed`,
	},
};

export const STATUS_TOAST_DURATION_MS = 4000;
