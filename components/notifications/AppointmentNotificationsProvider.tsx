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
import {
	readActiveOutletId,
	subscribeActiveOutletId,
} from "@/lib/appointments/active-outlet";
import { playStatusSound } from "@/lib/appointments/play-status-sound";
import {
	APPOINTMENT_STATUS_NOTIFICATIONS,
	STATUS_TOAST_DURATION_MS,
} from "@/lib/constants/appointment-notifications";
import type { AppointmentStatus } from "@/lib/constants/appointment-status";
import { createClient } from "@/lib/supabase/client";

const SUPPRESS_WINDOW_MS = 5000;

type ToastSource = {
	customerName: string;
	employeeName?: string | null;
	roomName?: string | null;
};

type ContextValue = {
	showStatusToast: (source: ToastSource, status: AppointmentStatus) => void;
	suppressNextRealtime: (
		appointmentId: string,
		status: AppointmentStatus,
	) => void;
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
	initialOutletId: string | null;
	children: ReactNode;
};

const APPOINTMENT_REALTIME_SELECT =
	"id, status, outlet_id, lead_name, customer:customers!appointments_customer_id_fkey(first_name, last_name), employee:employees!appointments_employee_id_fkey(first_name, last_name), room:rooms!appointments_room_id_fkey(name)";

export function AppointmentNotificationsProvider({
	initialOutletId,
	children,
}: Props) {
	const router = useRouter();
	const [outletId, setOutletId] = useState<string | null>(initialOutletId);
	const [toasts, setToasts] = useState<StatusToast[]>([]);
	const suppressedRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		const stored = readActiveOutletId();
		if (stored) setOutletId(stored);
		const unsub = subscribeActiveOutletId((next) => {
			if (next) setOutletId(next);
		});
		return unsub;
	}, []);

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
			setToasts((prev) => [
				...prev,
				{
					id,
					status,
					title: notif.toastTitle(source.customerName),
					subtitle,
				},
			]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, STATUS_TOAST_DURATION_MS);
		},
		[],
	);

	const suppressNextRealtime = useCallback(
		(appointmentId: string, status: AppointmentStatus) => {
			suppressedRef.current.set(`${appointmentId}:${status}`, Date.now());
		},
		[],
	);

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

					const key = `${next.id}:${nextStatus}`;
					const suppressedAt = suppressedRef.current.get(key);
					if (
						suppressedAt !== undefined &&
						Date.now() - suppressedAt < SUPPRESS_WINDOW_MS
					) {
						suppressedRef.current.delete(key);
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
