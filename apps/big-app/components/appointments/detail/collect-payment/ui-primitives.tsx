import { cn } from "@/lib/utils";

export function Row({
	label,
	value,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-xs text-muted-foreground">{label}</span>
			<div className="flex items-center">{value}</div>
		</div>
	);
}

export function Toggle({
	checked,
	onCheckedChange,
}: {
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				"relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition",
				checked ? "bg-blue-600" : "bg-muted",
			)}
		>
			<span
				className={cn(
					"inline-block size-3 rounded-full bg-white transition",
					checked ? "translate-x-3.5" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
