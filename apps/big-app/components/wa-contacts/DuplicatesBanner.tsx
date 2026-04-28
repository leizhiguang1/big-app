"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DuplicateSuggestion } from "@aimbig/wa-client";

type Props = {
	suggestions: DuplicateSuggestion[];
	onMerge: (primaryJid: string, secondaryJid: string) => void;
};

export function DuplicatesBanner({ suggestions, onMerge }: Props) {
	const [dismissed, setDismissed] = useState<Set<number>>(new Set());

	const visible = suggestions
		.map((s, i) => ({ s, i }))
		.filter(({ i }) => !dismissed.has(i));

	if (visible.length === 0) return null;

	return (
		<section className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
			<header className="mb-2 flex items-center gap-2 font-semibold text-sm">
				<AlertTriangle className="size-4" />
				{visible.length} possible duplicate{visible.length === 1 ? "" : "s"}{" "}
				found
			</header>
			<ul className="flex flex-col gap-2">
				{visible.map(({ s, i }) => (
					<li
						key={i}
						className="flex flex-wrap items-start justify-between gap-3 rounded bg-white/60 px-3 py-2 text-xs"
					>
						{s.reason === "bogus_lid_phone" ? (
							<div>
								<div className="font-medium">
									Bogus phone (WhatsApp internal ID)
								</div>
								<div className="mt-0.5 text-amber-800">
									{s.name}{" "}
									<span className="font-mono text-red-600">
										+{s.contacts[0]?.phone}
									</span>
								</div>
								<p className="mt-1 text-amber-700">
									This number is a WhatsApp internal ID, not a real phone.
									Safe to delete.
								</p>
							</div>
						) : (
							<div>
								<div className="font-medium">
									Same name “{s.name}”
								</div>
								<ul className="mt-1 flex flex-col gap-0.5">
									{s.contacts.map((c) => (
										<li key={c.jid} className="font-mono">
											{c.phone ? `+${c.phone}` : "no phone"}
											{c.crmStatus ? ` · ${c.crmStatus}` : ""}
											{c.tags?.length ? ` · ${c.tags.join(", ")}` : ""}
										</li>
									))}
								</ul>
							</div>
						)}
						<div className="flex items-center gap-1">
							{s.reason === "same_name" &&
								s.contacts.length === 2 &&
								s.suggestedPrimary && (
									<Button
										size="sm"
										onClick={() => {
											const secondaryJid = s.contacts.find(
												(c) => c.jid !== s.suggestedPrimary,
											)?.jid;
											if (secondaryJid)
												onMerge(s.suggestedPrimary as string, secondaryJid);
										}}
									>
										Review & Merge
									</Button>
								)}
							<Button
								size="icon"
								variant="ghost"
								onClick={() =>
									setDismissed((prev) => {
										const next = new Set(prev);
										next.add(i);
										return next;
									})
								}
								aria-label="Dismiss"
							>
								<X className="size-4" />
							</Button>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
