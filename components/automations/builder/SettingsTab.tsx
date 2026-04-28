"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
	timezone?: string;
	allowReEnrollment?: boolean;
	stopOnResponse?: boolean;
};

type Props = {
	name: string;
	setName: (v: string) => void;
	description: string;
	setDescription: (v: string) => void;
	enabled: boolean;
	setEnabled: (v: boolean) => void;
	settings: Settings;
	setSettings: (next: Settings) => void;
};

export function SettingsTab({
	name,
	setName,
	description,
	setDescription,
	enabled,
	setEnabled,
	settings,
	setSettings,
}: Props) {
	const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
		setSettings({ ...settings, [key]: value });

	return (
		<div className="flex max-w-2xl flex-col gap-4 p-6">
			<div>
				<Label htmlFor="wf-name">Workflow name</Label>
				<Input
					id="wf-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Untitled workflow"
					className="mt-1.5"
				/>
			</div>
			<div>
				<Label htmlFor="wf-desc">Description (optional)</Label>
				<Textarea
					id="wf-desc"
					rows={3}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="What does this workflow do?"
					className="mt-1.5"
				/>
			</div>

			<section className="rounded-lg border bg-card">
				<header className="border-b px-4 py-2.5 font-semibold text-sm">
					Activation
				</header>
				<div className="divide-y">
					<RowToggle
						title="Active"
						description="When off, this workflow won't fire on triggers."
						checked={enabled}
						onChange={setEnabled}
					/>
					<RowToggle
						title="Allow re-enrollment"
						description="If a contact has already been through this workflow, allow them to enter it again on a new trigger."
						checked={!!settings.allowReEnrollment}
						onChange={(v) => update("allowReEnrollment", v)}
					/>
					<RowToggle
						title="Stop on response"
						description="If the customer replies during a delay, halt remaining actions."
						checked={!!settings.stopOnResponse}
						onChange={(v) => update("stopOnResponse", v)}
					/>
				</div>
			</section>

			<div>
				<Label htmlFor="wf-tz">Timezone</Label>
				<Input
					id="wf-tz"
					value={settings.timezone ?? ""}
					onChange={(e) => update("timezone", e.target.value)}
					placeholder="Asia/Kuala_Lumpur"
					className="mt-1.5 font-mono"
				/>
				<p className="mt-1 text-muted-foreground text-xs">
					Used by Scheduler / Birthday triggers and any time-based actions.
				</p>
			</div>
		</div>
	);
}

function RowToggle({
	title,
	description,
	checked,
	onChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
			<div>
				<div className="font-medium text-sm">{title}</div>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			<Switch checked={checked} onCheckedChange={onChange} />
		</label>
	);
}
