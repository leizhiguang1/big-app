"use client";

import {
	BellRing,
	Check,
	MessageSquare,
	Phone,
	User2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { setDashboardFollowUpReminderDoneAction } from "@/lib/actions/follow-ups";
import type { ReminderFollowUp } from "@/lib/services/follow-ups";
import { cn } from "@/lib/utils";

type Props = { reminders: ReminderFollowUp[] };

function customerName(c: ReminderFollowUp["customer"]) {
	if (!c) return "—";
	return `${c.first_name} ${c.last_name ?? ""}`.trim() || "—";
}

function todayISO() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

function bucketOf(
	date: string,
	today: string,
): "overdue" | "today" | "upcoming" {
	if (date < today) return "overdue";
	if (date === today) return "today";
	return "upcoming";
}

function formatReminderDate(iso: string) {
	const [y, m, d] = iso.split("-").map(Number);
	if (!y || !m || !d) return iso;
	return new Date(y, m - 1, d).toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
	});
}

export function DashboardRemindersCard({ reminders }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const today = todayISO();

	const { pendingList, doneList } = useMemo(() => {
		const p: ReminderFollowUp[] = [];
		const d: ReminderFollowUp[] = [];
		for (const r of reminders) {
			if (r.reminder_done) d.push(r);
			else p.push(r);
		}
		return { pendingList: p, doneList: d };
	}, [reminders]);

	const handleToggleDone = (id: string, current: boolean) => {
		startTransition(async () => {
			await setDashboardFollowUpReminderDoneAction(id, !current);
			router.refresh();
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<BellRing className="size-4 text-violet-600" />
					My reminders
				</CardTitle>
				<CardDescription>
					{pendingList.length === 0
						? "No pending reminders"
						: `${pendingList.length} reminder${pendingList.length === 1 ? "" : "s"} assigned to you`}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{pendingList.length === 0 && doneList.length === 0 ? (
					<div className="rounded-md border border-dashed p-5 text-center text-muted-foreground text-sm">
						Nothing to follow up on.
					</div>
				) : (
					<>
						{pendingList.map((r) => (
							<ReminderRow
								key={r.id}
								reminder={r}
								today={today}
								onToggleDone={() => handleToggleDone(r.id, r.reminder_done)}
								disabled={pending}
							/>
						))}
						{doneList.length > 0 && (
							<details className="mt-2">
								<summary className="cursor-pointer text-muted-foreground text-xs">
									Done · {doneList.length}
								</summary>
								<div className="mt-2 flex flex-col gap-2">
									{doneList.map((r) => (
										<ReminderRow
											key={r.id}
											reminder={r}
											today={today}
											onToggleDone={() =>
												handleToggleDone(r.id, r.reminder_done)
											}
											disabled={pending}
										/>
									))}
								</div>
							</details>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}

function ReminderRow({
	reminder,
	today,
	onToggleDone,
	disabled,
}: {
	reminder: ReminderFollowUp;
	today: string;
	onToggleDone: () => void;
	disabled: boolean;
}) {
	const date = reminder.reminder_date ?? today;
	const bucket = bucketOf(date, today);
	const Icon = reminder.reminder_method === "whatsapp" ? MessageSquare : Phone;
	const customerLink = reminder.customer
		? `/customers/${reminder.customer.id}`
		: null;
	const appointmentLink = reminder.appointment
		? `/appointments/${reminder.appointment.booking_ref}`
		: null;
	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-md border p-3",
				reminder.reminder_done && "opacity-60",
				!reminder.reminder_done &&
					bucket === "overdue" &&
					"border-rose-300 bg-rose-50/50",
				!reminder.reminder_done &&
					bucket === "today" &&
					"border-amber-300 bg-amber-50/60",
			)}
		>
			<button
				type="button"
				onClick={onToggleDone}
				disabled={disabled}
				aria-label={reminder.reminder_done ? "Mark as pending" : "Mark as done"}
				className={cn(
					"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition",
					reminder.reminder_done
						? "border-emerald-500 bg-emerald-500 text-white"
						: "border-muted-foreground/40 hover:border-emerald-500 hover:text-emerald-600",
				)}
			>
				{reminder.reminder_done && <Check className="size-3.5" />}
			</button>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<Icon className="size-3.5 shrink-0 text-violet-600" />
					<span className="font-semibold">
						{reminder.reminder_method === "whatsapp" ? "WhatsApp" : "Call"}
					</span>
					<span className="text-muted-foreground text-xs">
						· {formatReminderDate(date)}
					</span>
					{!reminder.reminder_done && bucket === "overdue" && (
						<span className="rounded bg-rose-500 px-1.5 py-px font-bold text-[9px] text-white uppercase tracking-wide">
							Overdue
						</span>
					)}
					{!reminder.reminder_done && bucket === "today" && (
						<span className="rounded bg-amber-500 px-1.5 py-px font-bold text-[9px] text-white uppercase tracking-wide">
							Today
						</span>
					)}
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
					{customerLink ? (
						<Link
							href={customerLink}
							className="inline-flex items-center gap-1 font-semibold hover:underline"
						>
							<User2 className="size-3" />
							{customerName(reminder.customer)}
						</Link>
					) : (
						<span className="inline-flex items-center gap-1 text-muted-foreground">
							<User2 className="size-3" />
							{customerName(reminder.customer)}
						</span>
					)}
					{reminder.customer?.phone && (
						<span className="text-muted-foreground tabular-nums">
							{reminder.customer.phone}
						</span>
					)}
					{appointmentLink && (
						<Link
							href={appointmentLink}
							className="text-muted-foreground tabular-nums hover:underline"
						>
							{reminder.appointment?.booking_ref}
						</Link>
					)}
				</div>
				{reminder.content && (
					<p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-muted-foreground text-xs leading-snug">
						{reminder.content}
					</p>
				)}
			</div>
		</div>
	);
}
