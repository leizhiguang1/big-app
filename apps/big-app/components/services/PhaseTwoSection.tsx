import type { ReactNode } from "react";

export function PhaseTwoSection({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<section
			aria-disabled
			className="relative flex flex-col gap-2 rounded-md border border-dashed bg-muted/30 p-3"
		>
			<div className="flex items-center gap-2">
				<h3 className="font-medium text-sm">{title}</h3>
				<span className="rounded-full border bg-background px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
					Phase 2
				</span>
			</div>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			<div className="pointer-events-none opacity-60">{children}</div>
		</section>
	);
}
