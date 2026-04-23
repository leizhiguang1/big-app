"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type {
	Automation,
	AutomationAction,
	AutomationSendMessageAction,
	AutomationTrigger,
	AutomationTriggerType,
} from "@/components/chats/types";

type Props = {
	automation: Automation | null;
	onClose: () => void;
	onSave: (workflow: Automation) => void;
};

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string }[] = [
	{ value: "keyword_match", label: "Keyword in inbound message" },
	{ value: "inbound_message", label: "Any inbound message" },
	{ value: "appointment_booked", label: "Appointment booked" },
	{ value: "appointment_completed", label: "Appointment completed" },
	{ value: "appointment_cancelled", label: "Appointment cancelled" },
	{ value: "scheduler", label: "Scheduled (daily/weekly/monthly)" },
	{ value: "birthday_reminder", label: "Birthday reminder" },
	{ value: "inbound_webhook", label: "Inbound webhook" },
	{ value: "new_contact", label: "New contact" },
];

const VARIABLE_HELP = [
	"{{name}}",
	"{{phone}}",
	"{{patient_name}}",
	"{{appointment_date}}",
	"{{appointment_time}}",
	"{{service}}",
	"{{dentist}}",
];

function blankSendMessage(): AutomationSendMessageAction {
	return { type: "send_message", message: "" };
}

function blankAutomation(): Automation {
	return {
		id: "",
		name: "",
		enabled: true,
		trigger: { type: "keyword_match", keywords: [] },
		actions: [blankSendMessage()],
		createdAt: 0,
		updatedAt: 0,
	};
}

function findFirstSendMessage(
	actions: AutomationAction[],
): AutomationSendMessageAction | null {
	for (const a of actions) {
		if (a.type === "send_message") return a as AutomationSendMessageAction;
	}
	return null;
}

export function AutomationEditor({ automation, onClose, onSave }: Props) {
	const [name, setName] = useState("");
	const [enabled, setEnabled] = useState(true);
	const [trigger, setTrigger] = useState<AutomationTrigger>({
		type: "keyword_match",
		keywords: [],
	});
	const [keywordDraft, setKeywordDraft] = useState("");
	const [message, setMessage] = useState("");
	const [existingActions, setExistingActions] = useState<AutomationAction[]>(
		[],
	);

	useEffect(() => {
		const a = automation ?? blankAutomation();
		setName(a.name ?? "");
		setEnabled(a.enabled ?? true);
		setTrigger(a.trigger ?? { type: "keyword_match", keywords: [] });
		setKeywordDraft("");
		const first = findFirstSendMessage(a.actions ?? []);
		setMessage(first?.message ?? "");
		setExistingActions(a.actions ?? []);
	}, [automation]);

	const keywords = Array.isArray(trigger.keywords) ? trigger.keywords : [];

	const addKeyword = () => {
		const k = keywordDraft.trim();
		if (!k || keywords.includes(k)) {
			setKeywordDraft("");
			return;
		}
		setTrigger((t) => ({ ...t, keywords: [...keywords, k] }));
		setKeywordDraft("");
	};

	const removeKeyword = (k: string) => {
		setTrigger((t) => ({
			...t,
			keywords: keywords.filter((x) => x !== k),
		}));
	};

	const nonSendMessageActions = existingActions.filter(
		(a) => a.type !== "send_message",
	);

	const handleSave = () => {
		const updatedSendMessage: AutomationSendMessageAction = {
			...(findFirstSendMessage(existingActions) ?? {
				type: "send_message",
				message: "",
			}),
			type: "send_message",
			message,
		};
		const actions: AutomationAction[] = [
			updatedSendMessage,
			...nonSendMessageActions,
		];
		const payload: Automation = {
			...(automation ?? blankAutomation()),
			name: name.trim() || "(untitled)",
			enabled,
			trigger,
			actions,
		};
		onSave(payload);
	};

	const showKeywords = trigger.type === "keyword_match";
	const showSchedulerTime = trigger.type === "scheduler";

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>
						{automation ? "Edit automation" : "New automation"}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex-1">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Welcome reply"
								className="mt-1.5"
							/>
						</div>
						<label className="flex flex-col items-end gap-1.5">
							<span className="font-medium text-xs">Enabled</span>
							<Switch checked={enabled} onCheckedChange={setEnabled} />
						</label>
					</div>

					<section className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3">
						<div className="font-semibold text-sm">Trigger</div>
						<select
							value={trigger.type}
							onChange={(e) =>
								setTrigger({
									type: e.target.value as AutomationTriggerType,
									keywords: e.target.value === "keyword_match" ? [] : undefined,
								})
							}
							className={SELECT_CLASS}
						>
							{TRIGGER_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>

						{showKeywords && (
							<div className="flex flex-col gap-1.5">
								<Label>Keywords (any match)</Label>
								<div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2">
									{keywords.map((k) => (
										<span
											key={k}
											className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-[11px] text-sky-800"
										>
											{k}
											<button
												type="button"
												onClick={() => removeKeyword(k)}
												className="hover:text-sky-950"
												aria-label={`Remove ${k}`}
											>
												×
											</button>
										</span>
									))}
									<input
										value={keywordDraft}
										onChange={(e) => setKeywordDraft(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												addKeyword();
											}
										}}
										placeholder="Type and press Enter"
										className="h-6 min-w-[120px] border-0 bg-transparent text-xs outline-none"
									/>
								</div>
							</div>
						)}

						{showSchedulerTime && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="sched-freq">Frequency</Label>
									<select
										id="sched-freq"
										value={(trigger.frequency as string) ?? "daily"}
										onChange={(e) =>
											setTrigger((t) => ({
												...t,
												frequency: e.target.value as
													| "daily"
													| "weekly"
													| "monthly",
											}))
										}
										className={`${SELECT_CLASS} mt-1.5 w-full`}
									>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
									</select>
								</div>
								<div>
									<Label htmlFor="sched-time">Time (HH:MM)</Label>
									<Input
										id="sched-time"
										value={(trigger.time as string) ?? ""}
										onChange={(e) =>
											setTrigger((t) => ({ ...t, time: e.target.value }))
										}
										placeholder="09:00"
										className="mt-1.5"
									/>
								</div>
							</div>
						)}
					</section>

					<section className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
						<div className="font-semibold text-sm">Reply message</div>
						<Textarea
							rows={5}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Type the message to send. Use {{variables}} for interpolation."
						/>
						<div className="flex flex-wrap gap-1 text-[11px]">
							<span className="text-muted-foreground">Variables:</span>
							{VARIABLE_HELP.map((v) => (
								<button
									key={v}
									type="button"
									onClick={() => setMessage((m) => `${m}${v}`)}
									className="rounded bg-muted px-1.5 py-0.5 font-mono hover:bg-muted-foreground/20"
								>
									{v}
								</button>
							))}
						</div>
					</section>

					{nonSendMessageActions.length > 0 && (
						<div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-xs">
							<AlertTriangle className="mt-0.5 size-4 shrink-0" />
							<div>
								This automation has {nonSendMessageActions.length} additional
								action{nonSendMessageActions.length === 1 ? "" : "s"} (
								{nonSendMessageActions.map((a) => a.type).join(", ")}) that this
								editor can't modify. They'll be preserved on save. To edit them,
								use the WhatsApp service admin UI.
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="border-t bg-muted/20 px-5 py-3">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
