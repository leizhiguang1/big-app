import { Bell, Pin } from "lucide-react";
import type { FollowUpWithRefs } from "@/lib/services/follow-ups";
import { cn } from "@/lib/utils";

type Props = {
	followUps: FollowUpWithRefs[];
};

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function CustomerFollowUpsTab({ followUps }: Props) {
	if (followUps.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No follow-ups yet.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{followUps.map((f) => (
				<div
					key={f.id}
					className={cn(
						"flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm",
						f.is_pinned && "border-amber-300 bg-amber-50/40",
					)}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
							{f.is_pinned && <Pin className="size-3.5 text-amber-600" />}
							<span>{formatDateTime(f.created_at)}</span>
							{f.author && (
								<span className="text-muted-foreground">
									by {f.author.first_name} {f.author.last_name}
								</span>
							)}
						</div>
						{f.has_reminder && f.reminder_date && (
							<div
								className={cn(
									"flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
									f.reminder_done
										? "border-emerald-300 bg-emerald-50 text-emerald-700"
										: "border-sky-300 bg-sky-50 text-sky-700",
								)}
							>
								<Bell className="size-3" />
								<span>{formatDate(f.reminder_date)}</span>
								{f.reminder_method && (
									<span className="capitalize">· {f.reminder_method}</span>
								)}
								{f.reminder_done && (
									<span className="font-semibold">· Done</span>
								)}
							</div>
						)}
					</div>
					<div className="whitespace-pre-wrap text-sm leading-relaxed">
						{f.content}
					</div>
					{f.reminder_employee && (
						<div className="text-[11px] text-muted-foreground">
							Assigned to {f.reminder_employee.first_name}{" "}
							{f.reminder_employee.last_name}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
