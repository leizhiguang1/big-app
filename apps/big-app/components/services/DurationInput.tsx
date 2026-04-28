"use client";

import { Input } from "@/components/ui/input";

export function DurationInput({
	value,
	onChange,
	disabled,
}: {
	value: number;
	onChange: (minutes: number) => void;
	disabled?: boolean;
}) {
	const hours = Math.floor(value / 60);
	const minutes = value % 60;

	const update = (nextHours: number, nextMinutes: number) => {
		const total = nextHours * 60 + nextMinutes;
		onChange(Math.max(5, Math.min(600, total)));
	};

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1">
				<Input
					type="number"
					min={0}
					max={10}
					step={1}
					className="h-9 w-16"
					disabled={disabled}
					value={hours}
					onChange={(e) => update(Number(e.target.value || 0), minutes)}
				/>
				<span className="text-muted-foreground text-xs">h</span>
			</div>
			<div className="flex items-center gap-1">
				<Input
					type="number"
					min={0}
					max={55}
					step={5}
					className="h-9 w-16"
					disabled={disabled}
					value={minutes}
					onChange={(e) => update(hours, Number(e.target.value || 0))}
				/>
				<span className="text-muted-foreground text-xs">min</span>
			</div>
		</div>
	);
}
