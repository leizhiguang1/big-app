"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AutomationAction } from "@aimbig/wa-client";

type Rule = {
	field: string;
	operator: string;
	values?: string[];
	value?: string;
};

const FIELDS = [
	{ value: "tags", label: "Tags" },
	{ value: "crm_status", label: "CRM Status" },
	{ value: "assigned_user", label: "Assigned User" },
	{ value: "name", label: "Name" },
	{ value: "phone", label: "Phone" },
	{ value: "last_message", label: "Last Message" },
];

const OPERATORS = [
	{ value: "contains", label: "contains" },
	{ value: "not_contains", label: "doesn't contain" },
	{ value: "equals", label: "equals" },
	{ value: "not_equals", label: "doesn't equal" },
	{ value: "is_empty", label: "is empty" },
	{ value: "is_not_empty", label: "is not empty" },
];

type Props = {
	action: AutomationAction;
	onChange: (next: AutomationAction) => void;
};

type Segment = {
	condition?: { rules?: Rule[] };
	actions?: AutomationAction[];
};

export function IfElseConfig({ action, onChange }: Props) {
	const segments =
		(action as AutomationAction & { segments?: Segment[] }).segments ?? [];
	const segment = segments[0] ?? {
		condition: { rules: [{ field: "tags", operator: "contains", values: [] }] },
		actions: [],
	};
	const rules: Rule[] = segment.condition?.rules ?? [];

	const update = (next: Segment) => {
		const updated = [...segments];
		updated[0] = next;
		onChange({ ...action, segments: updated } as AutomationAction);
	};

	const updateRule = (idx: number, patch: Partial<Rule>) => {
		const next = [...rules];
		next[idx] = { ...next[idx], ...patch };
		update({ ...segment, condition: { rules: next } });
	};

	const addRule = () => {
		update({
			...segment,
			condition: {
				rules: [
					...rules,
					{ field: "tags", operator: "contains", values: [] },
				],
			},
		});
	};

	const removeRule = (idx: number) => {
		const next = rules.filter((_, i) => i !== idx);
		update({ ...segment, condition: { rules: next } });
	};

	return (
		<div className="flex flex-col gap-3">
			<div>
				<Label>Condition (all rules must match)</Label>
				<div className="mt-1.5 flex flex-col gap-2">
					{rules.map((rule, idx) => (
						<div
							key={idx}
							className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-md border bg-muted/20 p-2"
						>
							<Select
								value={rule.field}
								onValueChange={(v) => updateRule(idx, { field: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FIELDS.map((f) => (
										<SelectItem key={f.value} value={f.value}>
											{f.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={rule.operator}
								onValueChange={(v) => updateRule(idx, { operator: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{OPERATORS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{rule.operator !== "is_empty" &&
							rule.operator !== "is_not_empty" ? (
								<Input
									value={
										Array.isArray(rule.values)
											? rule.values.join(", ")
											: (rule.value ?? "")
									}
									onChange={(e) =>
										updateRule(idx, {
											values: e.target.value
												.split(",")
												.map((v) => v.trim())
												.filter(Boolean),
										})
									}
									placeholder="value"
								/>
							) : (
								<div />
							)}
							<Button
								size="icon"
								variant="ghost"
								onClick={() => removeRule(idx)}
								disabled={rules.length === 1}
								aria-label="Remove rule"
							>
								<Trash2 className="size-4 text-destructive" />
							</Button>
						</div>
					))}
				</div>
				<Button size="sm" variant="outline" onClick={addRule} className="mt-2">
					<Plus className="size-3.5" /> Add rule
				</Button>
			</div>
			<p className="text-muted-foreground text-xs">
				Actions on the <strong>Yes</strong> branch run when the condition
				matches; actions on the <strong>No</strong> branch run otherwise.
			</p>
		</div>
	);
}
