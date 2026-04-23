"use client";

import { Info } from "lucide-react";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { setBrandSettingAction } from "@/lib/actions/brand-settings";
import {
	BRAND_SETTINGS,
	type BrandSettingKey,
	getSettingDef,
} from "@/lib/brand-config/settings";

type Props = {
	settingKey: BrandSettingKey;
	value: unknown;
	layout?: "row" | "stacked";
};

// Renders the right control for a setting, driven by the registry's `input`
// hint. Writes through setBrandSettingAction on change (with a tiny debounce
// for number/string inputs to avoid a save on every keystroke).
export function BrandSettingField({
	settingKey,
	value,
	layout = "row",
}: Props) {
	const def = getSettingDef(settingKey);
	const [local, setLocal] = useState<unknown>(value);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const commit = (next: unknown) => {
		setLocal(next);
		setError(null);
		startTransition(async () => {
			try {
				await setBrandSettingAction(settingKey, next);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Save failed");
			}
		});
	};

	const control = (() => {
		switch (def.input.kind) {
			case "boolean":
				return (
					<Switch
						checked={Boolean(local)}
						disabled={pending}
						onCheckedChange={commit}
					/>
				);
			case "number":
				return (
					<Input
						type="number"
						value={typeof local === "number" ? local : ""}
						min={def.input.min}
						max={def.input.max}
						step={def.input.step ?? 1}
						className="w-32"
						onChange={(e) => {
							const v = e.target.value;
							const n = v === "" ? "" : Number(v);
							setLocal(n);
						}}
						onBlur={() => {
							if (typeof local === "number" && !Number.isNaN(local))
								commit(local);
						}}
					/>
				);
			case "enum":
				return (
					<Select
						value={String(local)}
						disabled={pending}
						onValueChange={(v) => commit(v)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{def.input.options.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			case "string":
				return (
					<Input
						value={typeof local === "string" ? local : ""}
						placeholder={def.input.placeholder}
						onChange={(e) => setLocal(e.target.value)}
						onBlur={() => commit(local)}
						className="w-64"
					/>
				);
		}
	})();

	const unit =
		def.input.kind === "number" && def.input.unit ? (
			<span className="text-muted-foreground text-xs">{def.input.unit}</span>
		) : null;

	if (layout === "row") {
		return (
			<div className="flex items-center gap-3 py-1">
				{def.input.kind === "boolean" && control}
				<span className="flex-1 text-sm">{def.label}</span>
				{def.input.kind !== "boolean" && (
					<div className="flex items-center gap-2">
						{control}
						{unit}
					</div>
				)}
				{def.hint && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Info className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">{def.hint}</TooltipContent>
					</Tooltip>
				)}
				{error && <span className="text-destructive text-xs">{error}</span>}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Label>{def.label}</Label>
			<div className="flex items-center gap-2">
				{control}
				{unit}
			</div>
			{def.hint && <p className="text-muted-foreground text-xs">{def.hint}</p>}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}

// Suppress unused import warning for BRAND_SETTINGS when tree-shaken; the
// registry is referenced elsewhere. Re-export for convenience at call sites.
export { BRAND_SETTINGS };
