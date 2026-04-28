"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type {
	Automation,
	AutomationExecutionLog,
} from "@aimbig/wa-client";

type Props = {
	automation: Automation | null;
	logs: AutomationExecutionLog[];
	onClose: () => void;
};

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString();
}

export function AutomationExecutionLogPanel({
	automation,
	logs,
	onClose,
}: Props) {
	return (
		<Sheet
			open={!!automation}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Execution log</SheetTitle>
					<SheetDescription>
						{automation?.name || "(untitled)"} — last{" "}
						{Math.min(logs.length, 100)} run
						{logs.length === 1 ? "" : "s"}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-4 flex flex-col gap-2 overflow-y-auto">
					{logs.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No runs yet. The log updates live while this panel is open.
						</p>
					) : (
						logs.map((log) => {
							const errors = log.actionsRun.filter(
								(a) => a.status === "error",
							).length;
							return (
								<div
									key={log.id}
									className="flex flex-col gap-1 rounded-md border bg-background p-3"
								>
									<div className="flex items-center justify-between">
										<span className="font-medium text-sm">
											{log.contactName || log.contactJid}
										</span>
										<span className="text-muted-foreground text-xs">
											{formatTime(log.triggeredAt)}
										</span>
									</div>
									<div className="flex items-center gap-2 text-xs">
										<span className="rounded-full bg-muted px-2 py-0.5 font-mono">
											{log.triggerType}
										</span>
										{log.matchedKeyword && (
											<span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">
												keyword: {log.matchedKeyword}
											</span>
										)}
										{errors > 0 ? (
											<span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">
												{errors} error{errors === 1 ? "" : "s"}
											</span>
										) : (
											<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
												{log.actionsRun.length} action
												{log.actionsRun.length === 1 ? "" : "s"} ok
											</span>
										)}
									</div>
									{log.triggerText && (
										<div className="text-muted-foreground text-xs">
											“{log.triggerText.slice(0, 120)}
											{log.triggerText.length > 120 ? "…" : ""}”
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
