"use client";

import { BookOpen, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/components/chats/socket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KBBusinessInfoSection } from "./KBBusinessInfoSection";
import { KBFaqSection } from "./KBFaqSection";
import { KBServicesSection } from "./KBServicesSection";
import { QuickRepliesPanel } from "./QuickRepliesPanel";
import { DEFAULT_KB, kbToMarkdown, type StructuredKB } from "./kb-types";

const STORAGE_KEY = "wa_kb_structured";

function loadLocal(): StructuredKB | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as StructuredKB) : null;
	} catch {
		return null;
	}
}

function saveLocal(kb: StructuredKB) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kb));
	} catch {}
}

type DBService = {
	id: string;
	name: string;
	sku?: string | null;
	price?: number | null;
	duration?: number | null;
};

type Props = {
	dbServices?: DBService[];
};

export function KBClient({ dbServices = [] }: Props) {
	const [kb, setKb] = useState<StructuredKB | null>(loadLocal);
	const [serverMarkdown, setServerMarkdown] = useState<string>("");
	const [tab, setTab] = useState<"structured" | "raw">("structured");
	const [saving, setSaving] = useState(false);
	const [savedTick, setSavedTick] = useState(false);
	const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!kb) {
			const t = setTimeout(() => setKb(DEFAULT_KB), 800);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [kb]);

	useEffect(() => {
		const sock = getSocket();
		const onConnect = () => {
			sock.emit("get_kb", (data: string | { knowledgeBase?: string } | null) => {
				const md = typeof data === "string" ? data : (data?.knowledgeBase ?? "");
				setServerMarkdown(md);
			});
		};
		if (sock.connected) onConnect();
		else sock.on("connect", onConnect);
		return () => {
			sock.off("connect", onConnect);
		};
	}, []);

	const update = (patch: Partial<StructuredKB>) => {
		setKb((prev) => {
			if (!prev) return prev;
			const next = { ...prev, ...patch };
			saveLocal(next);
			return next;
		});
	};

	const handleSave = () => {
		if (!kb) return;
		setSaving(true);
		const md = kbToMarkdown(kb);
		setServerMarkdown(md);
		const sock = getSocket();
		const fallback = setTimeout(() => {
			setSaving(false);
			setSavedTick(true);
			if (tickTimer.current) clearTimeout(tickTimer.current);
			tickTimer.current = setTimeout(() => setSavedTick(false), 2000);
		}, 5000);
		sock.emit("save_kb", { knowledgeBase: md }, () => {
			clearTimeout(fallback);
			setSaving(false);
			setSavedTick(true);
			if (tickTimer.current) clearTimeout(tickTimer.current);
			tickTimer.current = setTimeout(() => setSavedTick(false), 2000);
		});
	};

	if (!kb) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" /> Loading knowledge base…
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700">
						<BookOpen className="size-5" />
					</div>
					<div>
						<h2 className="font-semibold text-lg">Knowledge Base</h2>
						<p className="text-muted-foreground text-sm">
							Information your AI bot uses when replying to customers.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md border bg-card p-0.5">
						<Button
							size="sm"
							variant={tab === "structured" ? "default" : "ghost"}
							onClick={() => setTab("structured")}
						>
							Structured
						</Button>
						<Button
							size="sm"
							variant={tab === "raw" ? "default" : "ghost"}
							onClick={() => setTab("raw")}
						>
							Markdown
						</Button>
					</div>
					<Button onClick={handleSave} disabled={saving}>
						<Save className="size-4" />
						{saving ? "Saving…" : savedTick ? "Saved" : "Save"}
					</Button>
				</div>
			</header>

			{tab === "structured" ? (
				<>
					<section className="rounded-lg border bg-card">
						<header className="border-b px-5 py-3">
							<h3 className="font-semibold text-sm">Business Information</h3>
						</header>
						<div className="px-5 py-4">
							<KBBusinessInfoSection
								data={kb.businessInfo}
								onChange={(businessInfo) => update({ businessInfo })}
							/>
						</div>
					</section>

					<section className="rounded-lg border bg-card">
						<header className="border-b px-5 py-3">
							<h3 className="font-semibold text-sm">Services & Pricing</h3>
						</header>
						<div className="px-5 py-4">
							<KBServicesSection
								services={kb.services}
								onChange={(services) => update({ services })}
								dbServices={dbServices}
							/>
						</div>
					</section>

					<section className="rounded-lg border bg-card">
						<header className="border-b px-5 py-3">
							<h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
						</header>
						<div className="px-5 py-4">
							<KBFaqSection
								faqs={kb.faqs}
								onChange={(faqs) => update({ faqs })}
							/>
						</div>
					</section>

					<section className="rounded-lg border bg-card">
						<header className="border-b px-5 py-3">
							<h3 className="font-semibold text-sm">Policies</h3>
							<p className="text-muted-foreground text-xs">
								Markdown is supported. Headings render as sections.
							</p>
						</header>
						<div className="px-5 py-4">
							<Textarea
								rows={10}
								value={kb.policies}
								onChange={(e) => update({ policies: e.target.value })}
								className="font-mono text-xs"
							/>
						</div>
					</section>
				</>
			) : (
				<section className="rounded-lg border bg-card">
					<header className="border-b px-5 py-3">
						<h3 className="font-semibold text-sm">Markdown (sent to AI)</h3>
						<p className="text-muted-foreground text-xs">
							Last saved value. Editing structured fields and saving will
							regenerate this.
						</p>
					</header>
					<div className="px-5 py-4">
						<Textarea
							rows={20}
							readOnly
							value={serverMarkdown || kbToMarkdown(kb)}
							className="font-mono text-xs"
						/>
					</div>
				</section>
			)}

			<QuickRepliesPanel />
		</div>
	);
}
