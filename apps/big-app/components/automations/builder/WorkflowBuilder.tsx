"use client";

import {
	ArrowLeft,
	Redo2,
	Save,
	Settings,
	Undo2,
	Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACTION_TYPES } from "@/components/automations/automation-constants";
import type {
	Automation,
	AutomationAction,
	AutomationTrigger,
} from "@aimbig/wa-client";
import { ActionConfig } from "./ActionConfig";
import { IfElseConfig } from "./IfElseConfig";
import { SettingsTab } from "./SettingsTab";
import { TriggerConfig } from "./TriggerConfig";
import { type Selection, WorkflowCanvas } from "./WorkflowCanvas";
import {
	type Path,
	blankAction,
	getActionAtPath,
	pathsEqual,
} from "./builder-utils";

type Props = {
	workflow: Automation | null;
	onBack: () => void;
	onSave: (workflow: Automation) => Promise<{ id?: string } | void>;
};

type State = {
	name: string;
	description: string;
	enabled: boolean;
	trigger: AutomationTrigger | null;
	actions: AutomationAction[];
	settings: {
		timezone?: string;
		allowReEnrollment?: boolean;
		stopOnResponse?: boolean;
	};
};

const blankState = (): State => ({
	name: "Untitled workflow",
	description: "",
	enabled: false,
	trigger: null,
	actions: [],
	settings: {
		timezone:
			typeof Intl !== "undefined"
				? Intl.DateTimeFormat().resolvedOptions().timeZone
				: "UTC",
		allowReEnrollment: false,
		stopOnResponse: true,
	},
});

const stateFrom = (wf: Automation | null): State => ({
	name: wf?.name ?? "Untitled workflow",
	description: ((wf as Automation & { description?: string })?.description ?? "") as string,
	enabled: wf?.enabled ?? false,
	trigger: wf?.trigger ?? null,
	actions: wf?.actions ?? [],
	settings: ((wf as Automation & { settings?: State["settings"] })?.settings ?? {
		timezone: blankState().settings.timezone,
		allowReEnrollment: false,
		stopOnResponse: true,
	}) as State["settings"],
});

export function WorkflowBuilder({ workflow, onBack, onSave }: Props) {
	const [state, setState] = useState<State>(() =>
		workflow ? stateFrom(workflow) : blankState(),
	);
	const [selection, setSelection] = useState<Selection>(null);
	const [tab, setTab] = useState<"builder" | "settings">("builder");
	const [history, setHistory] = useState<State[]>([]);
	const [future, setFuture] = useState<State[]>([]);
	const [saving, setSaving] = useState(false);
	const [savedTick, setSavedTick] = useState(false);
	const idRef = useRef<string | null>(workflow?.id ?? null);
	const stateRef = useRef(state);
	stateRef.current = state;

	const pushHistory = useCallback((before: State) => {
		setHistory((prev) => [...prev.slice(-29), before]);
		setFuture([]);
	}, []);

	const setStateTracked = useCallback(
		(updater: (prev: State) => State) => {
			setState((prev) => {
				pushHistory(prev);
				return updater(prev);
			});
		},
		[pushHistory],
	);

	const undo = useCallback(() => {
		setHistory((prev) => {
			if (prev.length === 0) return prev;
			const last = prev[prev.length - 1];
			setFuture((f) => [stateRef.current, ...f].slice(0, 30));
			setState(last);
			return prev.slice(0, -1);
		});
	}, []);

	const redo = useCallback(() => {
		setFuture((prev) => {
			if (prev.length === 0) return prev;
			const next = prev[0];
			setHistory((h) => [...h, stateRef.current].slice(-30));
			setState(next);
			return prev.slice(1);
		});
	}, []);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			)
				return;
			if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				undo();
			}
			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "y" || (e.key === "z" && e.shiftKey))
			) {
				e.preventDefault();
				redo();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [undo, redo]);

	const handleAddAction = (afterIdx: number, basePath: Path, type: string) => {
		const insertIdx = afterIdx + 1;
		const newAction = blankAction(type);
		setStateTracked((prev) => {
			const next = { ...prev };
			if (basePath.length === 0) {
				const updated = [...prev.actions];
				updated.splice(insertIdx, 0, newAction);
				next.actions = updated;
			} else {
				const [topIdx, branchId] = basePath as [number, string];
				next.actions = prev.actions.map((a, i) => {
					if (i !== topIdx) return a;
					if (branchId === "no" || branchId === "none") {
						const noBranch = [
							...((a as AutomationAction & { noBranch?: AutomationAction[] })
								.noBranch ?? []),
						];
						noBranch.splice(insertIdx, 0, newAction);
						return { ...a, noBranch } as AutomationAction;
					}
					const segIdx = branchId === "yes" ? 0 : Number.NaN;
					if (Number.isNaN(segIdx)) return a;
					const segs = [
						...(((a as AutomationAction & { segments?: unknown[] }).segments ??
							[]) as Array<{
							condition?: unknown;
							actions?: AutomationAction[];
						}>),
					];
					const seg = {
						...segs[segIdx],
						actions: [...(segs[segIdx]?.actions ?? [])],
					};
					seg.actions.splice(insertIdx, 0, newAction);
					segs[segIdx] = seg;
					return { ...a, segments: segs } as AutomationAction;
				});
			}
			return next;
		});
		const newPath: Path =
			basePath.length === 0 ? [insertIdx] : [...basePath, insertIdx];
		setTimeout(() => setSelection({ kind: "action", path: newPath }), 30);
	};

	const handleRemoveAction = (path: Path) => {
		setStateTracked((prev) => {
			const next = { ...prev };
			if (path.length === 1) {
				next.actions = prev.actions.filter((_, i) => i !== path[0]);
			} else {
				const [topIdx, branchId, subIdx] = path as [number, string, number];
				next.actions = prev.actions.map((a, i) => {
					if (i !== topIdx) return a;
					if (branchId === "no" || branchId === "none") {
						const noBranch = (
							(a as AutomationAction & { noBranch?: AutomationAction[] })
								.noBranch ?? []
						).filter((_, j) => j !== subIdx);
						return { ...a, noBranch } as AutomationAction;
					}
					const segIdx = branchId === "yes" ? 0 : Number.NaN;
					if (Number.isNaN(segIdx)) return a;
					const segs = [
						...(((a as AutomationAction & { segments?: unknown[] }).segments ??
							[]) as Array<{
							condition?: unknown;
							actions?: AutomationAction[];
						}>),
					];
					segs[segIdx] = {
						...segs[segIdx],
						actions: (segs[segIdx]?.actions ?? []).filter(
							(_, j) => j !== subIdx,
						),
					};
					return { ...a, segments: segs } as AutomationAction;
				});
			}
			return next;
		});
		if (
			selection?.kind === "action" &&
			pathsEqual(selection.path, path)
		)
			setSelection(null);
	};

	const updateActionAtPath = (path: Path, updated: AutomationAction) => {
		setStateTracked((prev) => {
			const next = { ...prev };
			if (path.length === 1) {
				next.actions = prev.actions.map((a, i) => (i === path[0] ? updated : a));
			} else {
				const [topIdx, branchId, subIdx] = path as [number, string, number];
				next.actions = prev.actions.map((a, i) => {
					if (i !== topIdx) return a;
					if (branchId === "no" || branchId === "none") {
						const noBranch = (
							(a as AutomationAction & { noBranch?: AutomationAction[] })
								.noBranch ?? []
						).map((s, j) => (j === subIdx ? updated : s));
						return { ...a, noBranch } as AutomationAction;
					}
					const segIdx = branchId === "yes" ? 0 : Number.NaN;
					if (Number.isNaN(segIdx)) return a;
					const segs = [
						...(((a as AutomationAction & { segments?: unknown[] }).segments ??
							[]) as Array<{
							condition?: unknown;
							actions?: AutomationAction[];
						}>),
					];
					segs[segIdx] = {
						...segs[segIdx],
						actions: (segs[segIdx]?.actions ?? []).map((s, j) =>
							j === subIdx ? updated : s,
						),
					};
					return { ...a, segments: segs } as AutomationAction;
				});
			}
			return next;
		});
	};

	const handleSave = async () => {
		setSaving(true);
		const payload: Automation = {
			id: idRef.current ?? "",
			name: state.name,
			description: state.description,
			enabled: state.enabled,
			trigger: state.trigger ?? { type: "" },
			actions: state.actions,
			settings: state.settings,
			createdAt: workflow?.createdAt ?? Date.now(),
			updatedAt: Date.now(),
		};
		try {
			const res = await onSave(payload);
			if (res && typeof res === "object" && "id" in res && res.id)
				idRef.current = res.id as string;
			setSavedTick(true);
			setTimeout(() => setSavedTick(false), 1500);
		} finally {
			setSaving(false);
		}
	};

	const editingAction =
		selection?.kind === "action"
			? getActionAtPath(state.actions, selection.path)
			: null;

	return (
		<div className="flex h-[calc(100vh-8rem)] flex-col">
			<header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
				<div className="flex min-w-0 items-center gap-2">
					<Button size="sm" variant="ghost" onClick={onBack}>
						<ArrowLeft className="size-4" /> Back
					</Button>
					<input
						value={state.name}
						onChange={(e) =>
							setState((prev) => ({ ...prev, name: e.target.value }))
						}
						className="min-w-0 flex-1 truncate rounded bg-transparent px-2 py-1 font-semibold text-sm outline-none focus:bg-muted/40"
					/>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md border bg-card p-0.5">
						<Button
							size="sm"
							variant={tab === "builder" ? "default" : "ghost"}
							onClick={() => setTab("builder")}
						>
							<Workflow className="size-4" /> Builder
						</Button>
						<Button
							size="sm"
							variant={tab === "settings" ? "default" : "ghost"}
							onClick={() => setTab("settings")}
						>
							<Settings className="size-4" /> Settings
						</Button>
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								onClick={undo}
								disabled={history.length === 0}
								aria-label="Undo"
							>
								<Undo2 className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Undo (⌘Z)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								onClick={redo}
								disabled={future.length === 0}
								aria-label="Redo"
							>
								<Redo2 className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Redo (⌘⇧Z)</TooltipContent>
					</Tooltip>
					<label className="flex items-center gap-1.5 text-xs">
						<Switch
							checked={state.enabled}
							onCheckedChange={(v) =>
								setState((prev) => ({ ...prev, enabled: v }))
							}
						/>
						{state.enabled ? "Active" : "Draft"}
					</label>
					<Button onClick={handleSave} disabled={saving}>
						<Save className="size-4" />
						{saving ? "Saving…" : savedTick ? "Saved" : "Save"}
					</Button>
				</div>
			</header>

			{tab === "settings" ? (
				<div className="flex-1 overflow-y-auto">
					<SettingsTab
						name={state.name}
						setName={(v) => setState((prev) => ({ ...prev, name: v }))}
						description={state.description}
						setDescription={(v) =>
							setState((prev) => ({ ...prev, description: v }))
						}
						enabled={state.enabled}
						setEnabled={(v) =>
							setState((prev) => ({ ...prev, enabled: v }))
						}
						settings={state.settings}
						setSettings={(s) => setState((prev) => ({ ...prev, settings: s }))}
					/>
				</div>
			) : (
				<div className="flex flex-1 overflow-hidden">
					<div className="flex-1 overflow-y-auto">
						<WorkflowCanvas
							trigger={state.trigger}
							actions={state.actions}
							selection={selection}
							onSelect={setSelection}
							onAddAction={handleAddAction}
							onRemoveAction={handleRemoveAction}
						/>
					</div>
					{selection && (
						<aside className="flex w-96 flex-col border-l bg-card">
							<header className="flex items-center justify-between border-b px-4 py-3">
								<div className="font-semibold text-sm">
									{selection.kind === "trigger"
										? "Configure trigger"
										: editingAction
											? `Configure ${ACTION_TYPES[editingAction.type]?.label ?? editingAction.type}`
											: "Configure action"}
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setSelection(null)}
								>
									Close
								</Button>
							</header>
							<div className="flex-1 overflow-y-auto p-4">
								{selection.kind === "trigger" && (
									<TriggerConfig
										trigger={state.trigger}
										onChange={(t) => {
											setStateTracked((prev) => ({ ...prev, trigger: t }));
										}}
									/>
								)}
								{selection.kind === "action" &&
									editingAction &&
									editingAction.type === "if_else" && (
										<IfElseConfig
											action={editingAction}
											onChange={(updated) =>
												updateActionAtPath(selection.path, updated)
											}
										/>
									)}
								{selection.kind === "action" &&
									editingAction &&
									editingAction.type !== "if_else" && (
										<ActionConfig
											action={editingAction}
											onChange={(updated) =>
												updateActionAtPath(selection.path, updated)
											}
										/>
									)}
							</div>
						</aside>
					)}
				</div>
			)}
		</div>
	);
}

