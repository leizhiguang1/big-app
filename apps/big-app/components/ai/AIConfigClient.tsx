"use client";

import { AlertTriangle, Bot, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/wa-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	AI_MODELS,
	DEFAULT_AI_CONFIG,
	type AIPageConfig,
} from "./ai-models";

const LOCAL_KEY = "wa_ai_config";

function loadLocal(): AIPageConfig | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(LOCAL_KEY);
		return raw ? (JSON.parse(raw) as AIPageConfig) : null;
	} catch {
		return null;
	}
}

function saveLocal(cfg: AIPageConfig) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg));
	} catch {}
}

const REPLY_MODES = [
	{
		value: "all" as const,
		label: "All Messages",
		desc: "AI replies to every incoming message.",
	},
	{
		value: "unassigned" as const,
		label: "Unassigned Only",
		desc: "Only when no staff is assigned to the contact.",
	},
];

const BOOKING_MODES = [
	{
		value: "approval" as const,
		label: "Needs Approval",
		desc: "Staff must approve a suggested booking before it's created.",
	},
	{
		value: "auto" as const,
		label: "Auto Book",
		desc: "AI books instantly when a date, time, and service are detected.",
	},
];

export function AIConfigClient() {
	const [config, setConfig] = useState<AIPageConfig | null>(null);
	const [saving, setSaving] = useState(false);
	const [savedTick, setSavedTick] = useState(false);
	const [testMsg, setTestMsg] = useState("");
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		ok?: boolean;
		reply?: string;
		error?: string;
	} | null>(null);
	const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const local = loadLocal();
		if (local) setConfig(local);
		const fallback = setTimeout(() => {
			setConfig((prev) => prev ?? DEFAULT_AI_CONFIG);
		}, 1500);
		const sock = getSocket();
		const fetchConfig = () => {
			sock.emit("get_ai_config", (data: Partial<AIPageConfig> | null) => {
				clearTimeout(fallback);
				const merged: AIPageConfig = {
					...DEFAULT_AI_CONFIG,
					...(local ?? {}),
					...(data ?? {}),
					apiKey: data?.apiKey || local?.apiKey || "",
				};
				setConfig(merged);
			});
		};
		if (sock.connected) fetchConfig();
		else sock.on("connect", fetchConfig);
		return () => {
			clearTimeout(fallback);
			sock.off("connect", fetchConfig);
		};
	}, []);

	if (!config) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" /> Loading AI configuration…
			</div>
		);
	}

	const selectedModel =
		AI_MODELS.find((m) => m.id === config.model) ?? AI_MODELS[0];

	const update = (patch: Partial<AIPageConfig>) =>
		setConfig((prev) => (prev ? { ...prev, ...patch } : prev));

	const handleSave = () => {
		if (!config) return;
		saveLocal(config);
		setSaving(true);
		const sock = getSocket();
		const fallback = setTimeout(() => {
			setSaving(false);
			setSavedTick(true);
			if (savedTimer.current) clearTimeout(savedTimer.current);
			savedTimer.current = setTimeout(() => setSavedTick(false), 2000);
		}, 5000);
		sock.emit("save_ai_config", config, () => {
			clearTimeout(fallback);
			setSaving(false);
			setSavedTick(true);
			if (savedTimer.current) clearTimeout(savedTimer.current);
			savedTimer.current = setTimeout(() => setSavedTick(false), 2000);
		});
	};

	const handleTest = () => {
		if (!testMsg.trim()) return;
		setTesting(true);
		setTestResult(null);
		getSocket().emit(
			"test_ai_reply",
			{ message: testMsg },
			(res: { ok?: boolean; reply?: string; error?: string }) => {
				setTesting(false);
				setTestResult(res);
			},
		);
	};

	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-md bg-sky-500/15 text-sky-600">
						<Bot className="size-5" />
					</div>
					<div>
						<h2 className="font-semibold text-lg">Conversations AI</h2>
						<p className="text-muted-foreground text-sm">
							Auto-read and reply to WhatsApp messages.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-2 text-sm">
						<Switch
							checked={config.enabled}
							onCheckedChange={(v) => update({ enabled: v })}
							aria-label="Toggle AI"
						/>
						<span className={config.enabled ? "font-medium" : ""}>
							{config.enabled ? "AI Bot Active" : "AI Bot Off"}
						</span>
					</label>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? "Saving…" : savedTick ? "✓ Saved" : "Save Config"}
					</Button>
				</div>
			</header>

			{config.enabled && !config.apiKey && (
				<div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					AI is enabled but no API key is set — the bot won't reply until you
					add one.
				</div>
			)}

			<section className="rounded-lg border bg-card">
				<header className="border-b px-5 py-3">
					<h3 className="font-semibold text-sm">AI Model</h3>
					<p className="text-muted-foreground text-xs">
						Pick a provider. The base URL auto-fills.
					</p>
				</header>
				<div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
					{AI_MODELS.map((m) => {
						const selected = config.model === m.id;
						return (
							<button
								type="button"
								key={m.id}
								onClick={() =>
									update({ model: m.id, apiBase: m.apiBase })
								}
								className={`flex flex-col gap-1.5 rounded-md border p-3 text-left transition-colors ${
									selected
										? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
										: "hover:bg-muted/40"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-medium text-sm">{m.label}</span>
									<Badge className={`${m.badgeClass} border-transparent`}>
										{m.badge}
									</Badge>
								</div>
								<p className="text-muted-foreground text-xs">{m.desc}</p>
							</button>
						);
					})}
				</div>
			</section>

			<section className="rounded-lg border bg-card">
				<header className="border-b px-5 py-3">
					<h3 className="font-semibold text-sm">API Credentials</h3>
				</header>
				<div className="flex flex-col gap-4 px-5 py-4">
					<div>
						<Label htmlFor="api-key">
							API Key
							<span className="ml-1 font-normal text-muted-foreground text-xs">
								— stored on this device, never sent to BIG servers
							</span>
						</Label>
						<Input
							id="api-key"
							type="password"
							value={config.apiKey}
							onChange={(e) => update({ apiKey: e.target.value })}
							placeholder="sk-…"
							className="mt-1.5 font-mono"
						/>
						<p className="mt-1 text-muted-foreground text-xs">
							Get a key at{" "}
							<a
								href={selectedModel.docsUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-0.5 text-sky-600 hover:underline"
							>
								{selectedModel.docsUrl.replace(/^https?:\/\//, "")}
								<ExternalLink className="size-3" />
							</a>
						</p>
					</div>
					<div>
						<Label htmlFor="api-base">API Base URL</Label>
						<Input
							id="api-base"
							value={config.apiBase}
							onChange={(e) => update({ apiBase: e.target.value })}
							className="mt-1.5 font-mono"
						/>
						<p className="mt-1 text-muted-foreground text-xs">
							Auto-filled per model. Override only for proxies or self-hosted.
						</p>
					</div>
				</div>
			</section>

			<section className="rounded-lg border bg-card">
				<header className="border-b px-5 py-3">
					<h3 className="font-semibold text-sm">Behavior</h3>
				</header>
				<div className="flex flex-col gap-5 px-5 py-4">
					<div>
						<Label className="font-medium">Reply Mode</Label>
						<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{REPLY_MODES.map((m) => {
								const selected = config.mode === m.value;
								return (
									<button
										type="button"
										key={m.value}
										onClick={() => update({ mode: m.value })}
										className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-colors ${
											selected
												? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
												: "hover:bg-muted/40"
										}`}
									>
										<span className="font-medium text-sm">{m.label}</span>
										<span className="text-muted-foreground text-xs">
											{m.desc}
										</span>
									</button>
								);
							})}
						</div>
					</div>
					<div>
						<Label className="font-medium">Appointment Booking Mode</Label>
						<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{BOOKING_MODES.map((m) => {
								const selected = config.bookingMode === m.value;
								return (
									<button
										type="button"
										key={m.value}
										onClick={() => update({ bookingMode: m.value })}
										className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-colors ${
											selected
												? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
												: "hover:bg-muted/40"
										}`}
									>
										<span className="font-medium text-sm">{m.label}</span>
										<span className="text-muted-foreground text-xs">
											{m.desc}
										</span>
									</button>
								);
							})}
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<Label htmlFor="handoff">Human Takeover Keyword</Label>
							<Input
								id="handoff"
								value={config.handoffKeyword}
								onChange={(e) =>
									update({ handoffKeyword: e.target.value.toUpperCase() })
								}
								placeholder="HUMAN"
								className="mt-1.5 font-mono"
							/>
							<p className="mt-1 text-muted-foreground text-xs">
								Customer types this word → AI stops, "Human Takeover" tag
								added.
							</p>
						</div>
						<div>
							<Label htmlFor="max-history">Conversation History Window</Label>
							<Input
								id="max-history"
								type="number"
								min={1}
								max={50}
								value={config.maxHistory}
								onChange={(e) =>
									update({
										maxHistory: Math.max(
											1,
											Math.min(50, Number(e.target.value) || 10),
										),
									})
								}
								className="mt-1.5"
							/>
							<p className="mt-1 text-muted-foreground text-xs">
								Number of past messages sent to the model for context.
							</p>
						</div>
					</div>
					<div>
						<Label htmlFor="system-prefix">System Prompt Prefix (optional)</Label>
						<Textarea
							id="system-prefix"
							rows={3}
							value={config.systemPromptPrefix ?? ""}
							onChange={(e) => update({ systemPromptPrefix: e.target.value })}
							placeholder="Extra instructions prepended before the knowledge base."
							className="mt-1.5"
						/>
					</div>
					<div>
						<Label htmlFor="allowed-numbers">Allowed Numbers (optional)</Label>
						<Input
							id="allowed-numbers"
							value={config.allowedNumbers ?? ""}
							onChange={(e) => update({ allowedNumbers: e.target.value })}
							placeholder="60123456789, 60198765432"
							className="mt-1.5 font-mono"
						/>
						<p className="mt-1 text-muted-foreground text-xs">
							Comma-separated. Leave blank to reply to everyone.
						</p>
					</div>
				</div>
			</section>

			<section className="rounded-lg border bg-card">
				<header className="border-b px-5 py-3">
					<h3 className="font-semibold text-sm">Test the bot</h3>
					<p className="text-muted-foreground text-xs">
						Sends one message through the live AI config without going to
						WhatsApp.
					</p>
				</header>
				<div className="flex flex-col gap-3 px-5 py-4">
					<Textarea
						rows={3}
						value={testMsg}
						onChange={(e) => setTestMsg(e.target.value)}
						placeholder="What time do you open on Saturday?"
					/>
					<div>
						<Button
							onClick={handleTest}
							disabled={testing || !testMsg.trim()}
						>
							{testing ? "Generating…" : "Send test"}
						</Button>
					</div>
					{testResult && (
						<div
							className={`rounded-md border px-3 py-2 text-sm ${
								testResult.ok === false || testResult.error
									? "border-destructive/40 bg-destructive/5 text-destructive"
									: "border-border bg-muted/30"
							}`}
						>
							{testResult.error ?? testResult.reply ?? "No reply returned."}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
