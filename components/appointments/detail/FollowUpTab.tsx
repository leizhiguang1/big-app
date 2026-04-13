"use client";

import { useEffect, useRef, useState } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { setAppointmentFollowUpAction } from "@/lib/actions/appointments";
import type { AppointmentWithRelations } from "@/lib/services/appointments";

type Props = {
	appointment: AppointmentWithRelations;
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

export function FollowUpTab({ appointment, onToast }: Props) {
	const [followUp, setFollowUp] = useState(appointment.follow_up ?? "");
	const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
	const lastSaved = useRef(appointment.follow_up ?? "");
	const debounceRef = useRef<number | null>(null);

	useEffect(() => {
		setFollowUp(appointment.follow_up ?? "");
		lastSaved.current = appointment.follow_up ?? "";
	}, [appointment.follow_up]);

	useEffect(() => {
		if (followUp === lastSaved.current) return;
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		setStatus("saving");
		debounceRef.current = window.setTimeout(() => {
			const payload = followUp.trim() === "" ? null : followUp.trim();
			setAppointmentFollowUpAction(appointment.id, payload)
				.then(() => {
					lastSaved.current = followUp;
					setStatus("saved");
					window.setTimeout(() => setStatus("idle"), 1500);
				})
				.catch((err) => {
					setStatus("idle");
					onToast(
						err instanceof Error ? err.message : "Could not save follow-up",
						"error",
					);
				});
		}, 500);
		return () => {
			if (debounceRef.current) window.clearTimeout(debounceRef.current);
		};
	}, [followUp, appointment.id, onToast]);

	return (
		<div className="rounded-md border bg-card p-4">
			<div className="flex items-center justify-between">
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					Follow-up instructions
				</div>
				{status === "saving" && (
					<span className="text-[10px] text-muted-foreground">Saving…</span>
				)}
				{status === "saved" && (
					<span className="text-[10px] text-emerald-600">Saved</span>
				)}
			</div>
			<textarea
				value={followUp}
				onChange={(e) => setFollowUp(e.target.value)}
				rows={10}
				placeholder="Next visit reminder, home-care instructions, post-op notes…"
				className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			/>
			<p className="mt-2 text-muted-foreground text-xs">
				Auto-saves as you type. Visible on this appointment only — for
				cross-visit history, use Case Notes.
			</p>
		</div>
	);
}
