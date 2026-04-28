"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
	TRIGGER_TYPES,
	type TriggerCatalog,
} from "@/components/automations/automation-constants";
import type { AutomationTrigger } from "@aimbig/wa-client";

type Props = {
	trigger: AutomationTrigger | null;
	onChange: (next: AutomationTrigger | null) => void;
};

function groupTriggers(catalog: TriggerCatalog) {
	const groups = new Map<string, Array<{ key: string; label: string; icon: string }>>();
	for (const [key, def] of Object.entries(catalog)) {
		const arr = groups.get(def.group) ?? [];
		arr.push({ key, label: def.label, icon: def.icon });
		groups.set(def.group, arr);
	}
	return Array.from(groups.entries());
}

export function TriggerConfig({ trigger, onChange }: Props) {
	const grouped = groupTriggers(TRIGGER_TYPES);

	const updateField = <K extends string>(
		field: K,
		value: AutomationTrigger[K],
	) => {
		onChange({ ...(trigger ?? { type: "" }), [field]: value } as AutomationTrigger);
	};

	const keywords = Array.isArray(trigger?.keywords)
		? (trigger?.keywords as string[])
		: [];

	const addKeyword = (k: string) => {
		const t = k.trim();
		if (!t || keywords.includes(t)) return;
		updateField("keywords", [...keywords, t]);
	};

	const removeKeyword = (k: string) => {
		updateField(
			"keywords",
			keywords.filter((x) => x !== k),
		);
	};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Trigger type</Label>
				<Select
					value={trigger?.type ?? ""}
					onValueChange={(v) =>
						onChange({
							type: v,
							keywords: v === "keyword_match" ? [] : undefined,
						})
					}
				>
					<SelectTrigger className="mt-1.5">
						<SelectValue placeholder="Pick a trigger…" />
					</SelectTrigger>
					<SelectContent>
						{grouped.map(([group, items]) => (
							<SelectGroup key={group}>
								<SelectLabel>{group}</SelectLabel>
								{items.map((it) => (
									<SelectItem key={it.key} value={it.key}>
										<span className="mr-1">{it.icon}</span>
										{it.label}
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>
			</div>

			{trigger?.type === "keyword_match" && (
				<div>
					<Label>Keywords (any match)</Label>
					<div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md border bg-card p-2">
						{keywords.map((k) => (
							<span
								key={k}
								className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-[11px] text-sky-800"
							>
								{k}
								<button
									type="button"
									onClick={() => removeKeyword(k)}
									aria-label={`Remove ${k}`}
									className="hover:text-sky-950"
								>
									<X className="size-3" />
								</button>
							</span>
						))}
						<KeywordInput onAdd={addKeyword} />
					</div>
					<p className="mt-1 text-muted-foreground text-xs">
						Match is case-insensitive. The trigger fires when any keyword
						appears in the inbound message.
					</p>
				</div>
			)}

			{trigger?.type === "scheduler" && (
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label htmlFor="sched-freq">Frequency</Label>
						<Select
							value={(trigger?.frequency as string) ?? "daily"}
							onValueChange={(v) =>
								updateField(
									"frequency",
									v as "daily" | "weekly" | "monthly",
								)
							}
						>
							<SelectTrigger id="sched-freq" className="mt-1.5">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
								<SelectItem value="monthly">Monthly</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="sched-time">Time (HH:MM)</Label>
						<Input
							id="sched-time"
							value={(trigger?.time as string) ?? ""}
							onChange={(e) => updateField("time", e.target.value)}
							placeholder="09:00"
							className="mt-1.5"
						/>
					</div>
				</div>
			)}

			{trigger?.type === "inbound_webhook" && (
				<div>
					<Label htmlFor="webhook-id">Webhook ID</Label>
					<Input
						id="webhook-id"
						value={(trigger?.webhookId as string) ?? ""}
						onChange={(e) => updateField("webhookId", e.target.value)}
						placeholder="my-form-submit"
						className="mt-1.5 font-mono"
					/>
					<p className="mt-1 text-muted-foreground text-xs">
						Wa-crm exposes <code>/webhooks/inbound/&lt;webhook-id&gt;</code>.
					</p>
				</div>
			)}

			<div className="flex justify-end">
				{trigger && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onChange(null)}
							>
								Clear trigger
							</Button>
						</TooltipTrigger>
						<TooltipContent>Workflow won't fire without a trigger.</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
}

function KeywordInput({ onAdd }: { onAdd: (k: string) => void }) {
	return (
		<div className="flex items-center gap-1">
			<input
				type="text"
				placeholder="Type and press Enter"
				className="h-6 min-w-[140px] border-0 bg-transparent text-xs outline-none"
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onAdd((e.currentTarget as HTMLInputElement).value);
						(e.currentTarget as HTMLInputElement).value = "";
					}
				}}
			/>
			<Plus className="size-3 text-muted-foreground" />
		</div>
	);
}
