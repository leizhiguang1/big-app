"use client";

import { Info } from "lucide-react";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateBillingSettingsAction } from "@/lib/actions/billing-settings";
import type { BillingSettings } from "@/lib/services/billing-settings";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	settings: BillingSettings;
	taxes: Tax[];
};

const SELECT_CLASS =
	"h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function formatTax(t: Tax) {
	return `${t.name} (${t.rate_pct.toFixed(2)}%)`;
}

// ZodError.message is a JSON blob — unwrap it to the first issue's message.
function friendlyErrorMessage(err: unknown): string {
	if (!(err instanceof Error)) return "Failed to save";
	const raw = err.message;
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed[0]?.message)
			return String(parsed[0].message);
	} catch {
		// fall through — raw wasn't JSON
	}
	return raw;
}

export function AutoForeignTaxForm({ settings, taxes }: Props) {
	const [enabled, setEnabled] = useState(settings.auto_foreign_tax_enabled);
	const [localId, setLocalId] = useState<string | null>(settings.local_tax_id);
	const [foreignId, setForeignId] = useState<string | null>(
		settings.foreign_tax_id,
	);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	function save(next: {
		enabled?: boolean;
		localId?: string | null;
		foreignId?: string | null;
	}) {
		const merged = {
			auto_foreign_tax_enabled: next.enabled ?? enabled,
			local_tax_id: next.localId === undefined ? localId : next.localId,
			foreign_tax_id: next.foreignId === undefined ? foreignId : next.foreignId,
		};
		setError(null);
		startTransition(async () => {
			try {
				await updateBillingSettingsAction(merged);
				setSavedAt(Date.now());
			} catch (err) {
				setError(friendlyErrorMessage(err));
			}
		});
	}

	const activeTaxes = taxes.filter((t) => t.is_active);
	const foreignLabel = foreignId
		? formatTax(
				taxes.find((t) => t.id === foreignId) ??
					({
						id: foreignId,
						name: "(deleted)",
						rate_pct: 0,
					} as Tax),
			)
		: "—";

	return (
		<div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
			<div className="flex items-start gap-3">
				<Switch
					checked={enabled}
					disabled={pending}
					onCheckedChange={(v) => {
						setEnabled(v);
						save({ enabled: v });
					}}
				/>
				<div className="flex-1 text-sm">
					Auto assign{" "}
					<span className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-medium text-xs">
						{foreignLabel}
					</span>{" "}
					to customers whose Country of Origin is not Malaysia.
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Info className="size-3.5 shrink-0 cursor-help text-muted-foreground" />
					</TooltipTrigger>
					<TooltipContent className="max-w-xs">
						When a customer's Country of Origin is set to something other than
						Malaysia, newly-added billing lines default to the foreigner tax.
						Staff can still override per line.
					</TooltipContent>
				</Tooltip>
			</div>

			<div className="grid gap-2 pl-10 sm:grid-cols-2">
				<label className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">Local tax (default)</span>
					<select
						className={SELECT_CLASS}
						value={localId ?? ""}
						disabled={pending}
						onChange={(e) => {
							const v = e.target.value || null;
							setLocalId(v);
							save({ localId: v });
						}}
					>
						<option value="">— None —</option>
						{activeTaxes.map((t) => (
							<option key={t.id} value={t.id}>
								{formatTax(t)}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">Foreigner tax</span>
					<select
						className={SELECT_CLASS}
						value={foreignId ?? ""}
						disabled={pending}
						onChange={(e) => {
							const v = e.target.value || null;
							setForeignId(v);
							save({ foreignId: v });
						}}
					>
						<option value="">— None —</option>
						{activeTaxes.map((t) => (
							<option key={t.id} value={t.id}>
								{formatTax(t)}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="flex items-center gap-2 pl-10 text-xs">
				{error ? (
					<span className="text-destructive">{error}</span>
				) : pending ? (
					<span className="text-muted-foreground">Saving…</span>
				) : enabled && !foreignId ? (
					<span className="text-amber-700">
						Auto-assign has no effect until a foreigner tax is picked.
					</span>
				) : savedAt ? (
					<span className="text-emerald-600">Saved</span>
				) : (
					<span className="text-muted-foreground">
						Manage rates at /config/taxes
					</span>
				)}
			</div>
		</div>
	);
}
