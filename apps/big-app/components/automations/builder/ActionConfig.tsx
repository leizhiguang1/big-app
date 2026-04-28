"use client";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	ACTION_TYPES,
	type ActionCatalog,
	VAR_TOKENS,
} from "@/components/automations/automation-constants";
import type { AutomationAction } from "@aimbig/wa-client";

type Props = {
	action: AutomationAction;
	onChange: (next: AutomationAction) => void;
};

function groupActions(catalog: ActionCatalog) {
	const groups = new Map<string, Array<{ key: string; label: string; icon: string }>>();
	for (const [key, def] of Object.entries(catalog)) {
		const arr = groups.get(def.group) ?? [];
		arr.push({ key, label: def.label, icon: def.icon });
		groups.set(def.group, arr);
	}
	return Array.from(groups.entries());
}

export function ActionConfig({ action, onChange }: Props) {
	const grouped = groupActions(ACTION_TYPES);
	const a = action as AutomationAction & Record<string, unknown>;

	const update = <K extends string>(field: K, value: unknown) =>
		onChange({ ...action, [field]: value });

	const insertVar = (token: string) => {
		const current = (a.message as string) ?? "";
		update("message", `${current}${token}`);
	};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Action type</Label>
				<Select
					value={action.type ?? ""}
					onValueChange={(v) => onChange({ ...action, type: v })}
				>
					<SelectTrigger className="mt-1.5">
						<SelectValue placeholder="Pick an action…" />
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

			{action.type === "send_message" && (
				<div>
					<Label htmlFor="msg">Message</Label>
					<Textarea
						id="msg"
						rows={5}
						value={(a.message as string) ?? ""}
						onChange={(e) => update("message", e.target.value)}
						placeholder="What should we send?"
						className="mt-1.5"
					/>
					<div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
						<span className="text-muted-foreground">Variables:</span>
						{VAR_TOKENS.map((v) => (
							<button
								type="button"
								key={v}
								onClick={() => insertVar(v)}
								className="rounded bg-muted px-1.5 py-0.5 font-mono hover:bg-muted-foreground/20"
							>
								{v}
							</button>
						))}
					</div>
				</div>
			)}

			{(action.type === "add_tag" || action.type === "remove_tag") && (
				<div>
					<Label htmlFor="tag">Tag</Label>
					<Input
						id="tag"
						value={(a.tag as string) ?? ""}
						onChange={(e) => update("tag", e.target.value)}
						placeholder="e.g. VIP"
						className="mt-1.5"
					/>
				</div>
			)}

			{action.type === "add_note" && (
				<div>
					<Label htmlFor="note">Note</Label>
					<Textarea
						id="note"
						rows={3}
						value={(a.note as string) ?? ""}
						onChange={(e) => update("note", e.target.value)}
						placeholder="Internal note added to the contact"
						className="mt-1.5"
					/>
				</div>
			)}

			{action.type === "wait" && (
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label htmlFor="dur">Duration</Label>
						<Input
							id="dur"
							type="number"
							min={1}
							value={(a.duration as number) ?? 1}
							onChange={(e) =>
								update("duration", Math.max(1, Number(e.target.value) || 1))
							}
							className="mt-1.5"
						/>
					</div>
					<div>
						<Label htmlFor="unit">Unit</Label>
						<Select
							value={(a.unit as string) ?? "hours"}
							onValueChange={(v) => update("unit", v)}
						>
							<SelectTrigger id="unit" className="mt-1.5">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="minutes">Minutes</SelectItem>
								<SelectItem value="hours">Hours</SelectItem>
								<SelectItem value="days">Days</SelectItem>
								<SelectItem value="weeks">Weeks</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			{action.type === "assign_user" && (
				<div>
					<Label htmlFor="user">Staff name</Label>
					<Input
						id="user"
						value={(a.user as string) ?? ""}
						onChange={(e) => update("user", e.target.value)}
						placeholder="Dr. Lim"
						className="mt-1.5"
					/>
				</div>
			)}

			{action.type === "update_field" && (
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label htmlFor="field">Field</Label>
						<Input
							id="field"
							value={(a.field as string) ?? ""}
							onChange={(e) => update("field", e.target.value)}
							placeholder="crmStatus"
							className="mt-1.5"
						/>
					</div>
					<div>
						<Label htmlFor="value">Value</Label>
						<Input
							id="value"
							value={(a.value as string) ?? ""}
							onChange={(e) => update("value", e.target.value)}
							placeholder="Customer"
							className="mt-1.5"
						/>
					</div>
				</div>
			)}

			{action.type === "post_webhook" && (
				<>
					<div>
						<Label htmlFor="url">URL</Label>
						<Input
							id="url"
							value={(a.url as string) ?? ""}
							onChange={(e) => update("url", e.target.value)}
							placeholder="https://example.com/hook"
							className="mt-1.5 font-mono"
						/>
					</div>
					<div>
						<Label htmlFor="payload">Payload (JSON, optional)</Label>
						<Textarea
							id="payload"
							rows={4}
							value={(a.payload as string) ?? ""}
							onChange={(e) => update("payload", e.target.value)}
							placeholder='{"event": "tagged"}'
							className="mt-1.5 font-mono text-xs"
						/>
					</div>
				</>
			)}

			{action.type === "send_internal_notification" && (
				<>
					<div>
						<Label htmlFor="staff">Notify (staff name, optional)</Label>
						<Input
							id="staff"
							value={(a.user as string) ?? ""}
							onChange={(e) => update("user", e.target.value)}
							placeholder="leave blank to notify all"
							className="mt-1.5"
						/>
					</div>
					<div>
						<Label htmlFor="msg-int">Message</Label>
						<Textarea
							id="msg-int"
							rows={3}
							value={(a.message as string) ?? ""}
							onChange={(e) => update("message", e.target.value)}
							className="mt-1.5"
						/>
					</div>
				</>
			)}

			{action.type === "send_email" && (
				<>
					<div>
						<Label htmlFor="email-subject">Subject</Label>
						<Input
							id="email-subject"
							value={(a.subject as string) ?? ""}
							onChange={(e) => update("subject", e.target.value)}
							className="mt-1.5"
						/>
					</div>
					<div>
						<Label htmlFor="email-body">Body</Label>
						<Textarea
							id="email-body"
							rows={6}
							value={(a.body as string) ?? ""}
							onChange={(e) => update("body", e.target.value)}
							className="mt-1.5"
						/>
					</div>
				</>
			)}

			{action.type === "manual_action" && (
				<div>
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
						value={(a.title as string) ?? ""}
						onChange={(e) => update("title", e.target.value)}
						placeholder="Call customer back"
						className="mt-1.5"
					/>
					<Label htmlFor="assignee" className="mt-3 block">
						Assignee (optional)
					</Label>
					<Input
						id="assignee"
						value={(a.assignTo as string) ?? ""}
						onChange={(e) => update("assignTo", e.target.value)}
						placeholder="Dr. Lim"
						className="mt-1.5"
					/>
				</div>
			)}

			{(action.type === "enable_dnd" || action.type === "disable_dnd") && (
				<p className="text-muted-foreground text-sm">
					No additional configuration. {ACTION_TYPES[action.type]?.label} on
					trigger fire.
				</p>
			)}

			{/* Fallback raw JSON editor for action types we don't have a dedicated UI for yet */}
			{!FIRST_CLASS_TYPES.has(action.type) && action.type && (
				<div>
					<Label htmlFor="raw">Raw configuration (JSON)</Label>
					<Textarea
						id="raw"
						rows={6}
						value={JSON.stringify(stripBaseFields(a), null, 2)}
						onChange={(e) => {
							try {
								const parsed = JSON.parse(e.target.value);
								onChange({
									id: action.id,
									type: action.type,
									...parsed,
								});
							} catch {
								// ignore parse errors mid-typing
							}
						}}
						className="mt-1.5 font-mono text-xs"
					/>
					<p className="mt-1 text-muted-foreground text-xs">
						This action type doesn't have a dedicated form yet. Edit the JSON
						directly. wa-crm consumes whatever shape you save.
					</p>
				</div>
			)}

			{action.type !== "enable_dnd" &&
				action.type !== "disable_dnd" &&
				action.type !== "if_else" && (
					<div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
						<div>
							<div className="font-medium text-sm">Skip if DND</div>
							<p className="text-muted-foreground text-xs">
								Don't run for contacts who have Do Not Disturb on.
							</p>
						</div>
						<Switch
							checked={Boolean(a.skipIfDnd)}
							onCheckedChange={(v) => update("skipIfDnd", v)}
						/>
					</div>
				)}
		</div>
	);
}

const FIRST_CLASS_TYPES = new Set([
	"send_message",
	"add_tag",
	"remove_tag",
	"add_note",
	"wait",
	"if_else",
	"assign_user",
	"update_field",
	"post_webhook",
	"send_internal_notification",
	"send_email",
	"manual_action",
	"enable_dnd",
	"disable_dnd",
]);

function stripBaseFields(a: Record<string, unknown>): Record<string, unknown> {
	const { id: _id, type: _type, ...rest } = a;
	return rest;
}
