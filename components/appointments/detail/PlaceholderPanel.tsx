import { Construction } from "lucide-react";

type Props = {
	title: string;
	variant?: "card" | "tab";
};

function PlaceholderRows() {
	return (
		<div className="divide-y divide-border/60">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:py-2"
				>
					<div className="min-w-0 flex-1 truncate text-muted-foreground text-xs sm:text-sm">
						<span className="rounded bg-muted/50 px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide">
							Placeholder
						</span>
						<span className="ml-2">Row {i} — coming soon</span>
					</div>
					<div className="flex shrink-0 items-center gap-2 sm:justify-end">
						<div className="h-8 w-full min-w-[140px] rounded-md border border-dashed bg-muted/20 sm:w-36" />
						<div className="h-8 w-20 rounded-md border border-dashed bg-muted/30 sm:w-24" />
					</div>
				</div>
			))}
		</div>
	);
}

export function PlaceholderPanel({ title, variant = "card" }: Props) {
	if (variant === "tab") {
		return (
			<div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/15 p-6 text-center shadow-sm">
				<Construction className="size-6 text-muted-foreground" />
				<div className="font-medium text-sm">{title}</div>
				<div className="text-muted-foreground text-xs">In development</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
			<div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
				{title}
			</div>
			<div className="mt-2">
				<PlaceholderRows />
			</div>
			<div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-[10px]">
				<Construction className="size-3 shrink-0" />
				<span>In development</span>
			</div>
		</div>
	);
}
