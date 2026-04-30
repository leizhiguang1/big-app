"use client";

import { useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	AppointmentStatusToastStack,
	type StatusToast,
} from "@/components/appointments/AppointmentStatusToastStack";
import { playStatusSound } from "@/lib/appointments/play-status-sound";
import {
	APPOINTMENT_STATUS_NOTIFICATIONS,
	STATUS_TOAST_DURATION_MS,
} from "@/lib/constants/appointment-notifications";
import type { AppointmentStatus } from "@/lib/constants/appointment-status";
import { createClient } from "@/lib/supabase/client";

// How long we keep a suppression entry alive. Generous to cover slow networks
// — the counter-based approach means we won't accidentally let events through,
// and stale entries are garbage-collected on every check.
const SUPPRESS_TTL_MS = 30_000;

type ToastSource = {
	appointmentId?: string;
	customerName: string;
	employeeName?: string | null;
	roomName?: string | null;
};

type SuppressEntry = { count: number; createdAt: number };

type ContextValue = {
	showStatusToast: (source: ToastSource, status: AppointmentStatus) => void;
	suppressNextRealtime: (appointmentId: string) => void;
};

const NotificationsContext = createContext<ContextValue | null>(null);

export function useAppointmentNotifications(): ContextValue {
	const ctx = useContext(NotificationsContext);
	if (!ctx) {
		throw new Error(
			"useAppointmentNotifications must be used inside <AppointmentNotificationsProvider>",
		);
	}
	return ctx;
}

type Props = {
	outletId: string | null;
	children: ReactNode;
};

const APPOINTMENT_REALTIME_SELECT =
	"id, status, outlet_id, lead_name, customer:customers!appointments_customer_id_fkey(first_name, last_name), employee:employees!appointments_employee_id_fkey(first_name, last_name), room:rooms!appointments_room_id_fkey(name)";

export function AppointmentNotificationsProvider({
	outletId,
	children,
}: Props) {
	const router = useRouter();
	const [toasts, setToasts] = useState<StatusToast[]>([]);
	const suppressedRef = useRef<Map<string, SuppressEntry>>(new Map());

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const pushToast = useCallback(
		(source: ToastSource, status: AppointmentStatus) => {
			const notif = APPOINTMENT_STATUS_NOTIFICATIONS[status];
			if (!notif.enabled) return;

			const employeeName = source.employeeName
				? `Dr. ${source.employeeName}`
				: null;
			const subtitle = [employeeName, source.roomName]
				.filter(Boolean)
				.join(" • ");

			playStatusSound(notif.sound);

			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const toast: StatusToast = {
				id,
				appointmentId: source.appointmentId,
				status,
				title: notif.toastTitle(source.customerName),
				subtitle,
			};
			setToasts((prev) => {
				// Rapid clicks on the same appointment → replace instead of stack
				const filtered = source.appointmentId
					? prev.filter((t) => t.appointmentId !== source.appointmentId)
					: prev;
				return [...filtered, toast];
			});
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, STATUS_TOAST_DURATION_MS);
		},
		[],
	);

	const suppressNextRealtime = useCallback((appointmentId: string) => {
		const existing = suppressedRef.current.get(appointmentId);
		if (existing && Date.now() - existing.createdAt < SUPPRESS_TTL_MS) {
			existing.count += 1;
		} else {
			suppressedRef.current.set(appointmentId, {
				count: 1,
				createdAt: Date.now(),
			});
		}
	}, []);

	useEffect(() => {
		if (!outletId) return;
		const supabase = createClient();
		const channel = supabase
			.channel(`appointments-notifications:${outletId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "appointments",
					filter: `outlet_id=eq.${outletId}`,
				},
				async (payload) => {
					const next = payload.new as {
						id: string;
						status: AppointmentStatus;
					};
					const prev = payload.old as { status?: AppointmentStatus };
					const nextStatus = next.status;
					const prevStatus = prev?.status;

					if (!nextStatus || nextStatus === prevStatus) return;

					// Garbage-collect stale entries
					for (const [k, v] of suppressedRef.current) {
						if (Date.now() - v.createdAt > SUPPRESS_TTL_MS)
							suppressedRef.current.delete(k);
					}

					const entry = suppressedRef.current.get(next.id);
					if (entry && entry.count > 0) {
						entry.count -= 1;
						if (entry.count <= 0) suppressedRef.current.delete(next.id);
						return;
					}

					router.refresh();

					const { data: row } = await supabase
						.from("appointments")
						.select(APPOINTMENT_REALTIME_SELECT)
						.eq("id", next.id)
						.maybeSingle();

					const customer = row?.customer as
						| { first_name: string; last_name: string | null }
						| null
						| undefined;
					const employee = row?.employee as
						| { first_name: string; last_name: string }
						| null
						| undefined;
					const room = row?.room as { name: string } | null | undefined;

					const customerName = customer
						? `${customer.first_name} ${customer.last_name ?? ""}`.trim()
						: ((row?.lead_name as string | null) ?? "Customer");
					const employeeName = employee
						? `${employee.first_name} ${employee.last_name}`.trim()
						: null;

					pushToast(
						{
							appointmentId: next.id,
							customerName,
							employeeName,
							roomName: room?.name ?? null,
						},
						nextStatus,
					);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [outletId, router, pushToast]);

	return (
		<NotificationsContext.Provider
			value={{ showStatusToast: pushToast, suppressNextRealtime }}
		>
			{children}
			<AppointmentStatusToastStack toasts={toasts} onDismiss={dismiss} />
		</NotificationsContext.Provider>
	);
}
