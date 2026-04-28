"use client";

import { Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AutomationExecutionLogPanel } from "@/components/automations/AutomationExecutionLog";
import { AutomationsList } from "@/components/automations/AutomationsList";
import { FolderTabs } from "@/components/automations/FolderTabs";
import { NewWorkflowDialog } from "@/components/automations/NewWorkflowDialog";
import { TemplatesGallery } from "@/components/automations/TemplatesGallery";
import { WorkflowBuilder } from "@/components/automations/builder/WorkflowBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disposeSocket, getSocket } from "@/lib/wa-client";
import type {
	Automation,
	AutomationExecutionLog,
	AutomationFolder,
} from "@aimbig/wa-client";

const FOLDER_KEY = "auto_folders";

function loadLocalFolders(): AutomationFolder[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(FOLDER_KEY);
		return raw ? (JSON.parse(raw) as AutomationFolder[]) : [];
	} catch {
		return [];
	}
}

function saveLocalFolders(folders: AutomationFolder[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
	} catch {}
}

export function AutomationsClient() {
	const [automations, setAutomations] = useState<Automation[]>([]);
	const [folders, setFolders] = useState<AutomationFolder[]>(loadLocalFolders);
	const [foldersLoaded, setFoldersLoaded] = useState(false);
	const [connected, setConnected] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [activeFolder, setActiveFolder] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [showNewDialog, setShowNewDialog] = useState(false);
	const [showTemplates, setShowTemplates] = useState(false);
	const [editing, setEditing] = useState<Automation | null>(null);
	const [logPanelFor, setLogPanelFor] = useState<Automation | null>(null);
	const [logs, setLogs] = useState<AutomationExecutionLog[]>([]);

	useEffect(() => () => disposeSocket(), []);

	useEffect(() => {
		const socket = getSocket();

		const onConnect = () => {
			setConnected(true);
			socket.emit("get_automations", (list: Automation[]) => {
				if (Array.isArray(list)) setAutomations(list);
				setLoaded(true);
			});
			socket.emit(
				"get_automation_folders",
				(serverFolders: AutomationFolder[] | null) => {
					if (Array.isArray(serverFolders) && serverFolders.length > 0) {
						setFolders(serverFolders);
					}
					setFoldersLoaded(true);
				},
			);
		};
		const onDisconnect = () => setConnected(false);
		const onUpdate = (list: Automation[]) => {
			if (Array.isArray(list)) setAutomations(list);
		};
		const onFoldersUpdate = (next: AutomationFolder[]) => {
			if (Array.isArray(next)) setFolders(next);
		};
		const onExecLog = ({
			automationId,
			entry,
		}: {
			automationId: string;
			entry: AutomationExecutionLog;
		}) => {
			if (logPanelFor && logPanelFor.id === automationId) {
				setLogs((prev) => [entry, ...prev].slice(0, 100));
			}
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("automations_update", onUpdate);
		socket.on("automation_folders_update", onFoldersUpdate);
		socket.on("execution_log", onExecLog);

		if (socket.connected) onConnect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("automations_update", onUpdate);
			socket.off("automation_folders_update", onFoldersUpdate);
			socket.off("execution_log", onExecLog);
		};
	}, [logPanelFor]);

	useEffect(() => {
		if (!foldersLoaded) return;
		saveLocalFolders(folders);
		if (connected) {
			getSocket().emit("save_automation_folders", folders);
		}
	}, [folders, foldersLoaded, connected]);

	const visibleAutomations = useMemo(() => {
		let list = automations;
		if (activeFolder === "__uncategorized") {
			const allFolderIds = new Set(folders.flatMap((f) => f.workflowIds));
			list = list.filter((a) => !allFolderIds.has(a.id));
		} else if (activeFolder) {
			const folder = folders.find((f) => f.id === activeFolder);
			const ids = new Set(folder?.workflowIds ?? []);
			list = list.filter((a) => ids.has(a.id));
		}
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(a) =>
					a.name?.toLowerCase().includes(q) ||
					a.trigger?.type?.toLowerCase().includes(q),
			);
		}
		return list;
	}, [automations, folders, activeFolder, search]);

	const handleToggle = useCallback((id: string, enabled: boolean) => {
		getSocket().emit("toggle_automation", { id, enabled });
	}, []);

	const handleDelete = useCallback(
		(id: string) => {
			getSocket().emit("delete_automation", { id });
			setFolders((prev) =>
				prev.map((f) => ({
					...f,
					workflowIds: f.workflowIds.filter((wfId) => wfId !== id),
				})),
			);
		},
		[],
	);

	const saveWorkflow = useCallback(
		async (workflow: Automation): Promise<{ id?: string }> => {
			return new Promise((resolve) => {
				const payload =
					!workflow.id || workflow.id === ""
						? { ...workflow, id: undefined }
						: workflow;
				getSocket().emit(
					"save_automation",
					payload,
					(res: { ok?: boolean; id?: string }) => {
						if (res?.id) {
							setEditing((prev) =>
								prev ? { ...prev, id: res.id as string } : prev,
							);
						}
						resolve({ id: res?.id });
					},
				);
			});
		},
		[],
	);

	const handleViewLog = useCallback((automation: Automation) => {
		setLogPanelFor(automation);
		getSocket().emit(
			"get_execution_logs",
			{ automationId: automation.id },
			(entries: AutomationExecutionLog[]) => {
				setLogs(Array.isArray(entries) ? entries : []);
			},
		);
	}, []);

	const handleCreateFolder = (name: string) => {
		setFolders((prev) => [
			...prev,
			{ id: `folder-${Date.now()}`, name, workflowIds: [] },
		]);
	};

	const handleRenameFolder = (id: string, name: string) => {
		setFolders((prev) =>
			prev.map((f) => (f.id === id ? { ...f, name } : f)),
		);
	};

	const handleDeleteFolder = (id: string) => {
		setFolders((prev) => prev.filter((f) => f.id !== id));
		if (activeFolder === id) setActiveFolder(null);
	};

	const handleMoveWorkflow = (workflowId: string, folderId: string) => {
		setFolders((prev) =>
			prev.map((f) => {
				const without = f.workflowIds.filter((id) => id !== workflowId);
				if (f.id === folderId) return { ...f, workflowIds: [...without, workflowId] };
				return { ...f, workflowIds: without };
			}),
		);
	};

	if (editing) {
		return (
			<WorkflowBuilder
				workflow={editing}
				onBack={() => setEditing(null)}
				onSave={async (wf) => {
					const res = await saveWorkflow(wf);
					return res;
				}}
			/>
		);
	}

	return (
		<>
			{!connected && (
				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					Connecting to WhatsApp service…
				</div>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search workflows…"
						className="pl-9"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
							aria-label="Clear search"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
				<Button onClick={() => setShowNewDialog(true)}>
					<Plus className="size-4" /> New workflow
				</Button>
			</div>

			<FolderTabs
				folders={folders}
				automations={automations}
				activeFolder={activeFolder}
				onActivate={setActiveFolder}
				onCreate={handleCreateFolder}
				onRename={handleRenameFolder}
				onDelete={handleDeleteFolder}
				onMoveWorkflow={handleMoveWorkflow}
			/>

			<AutomationsList
				automations={visibleAutomations}
				isLoading={!loaded && automations.length === 0}
				onEdit={(a) => setEditing(a)}
				onToggle={handleToggle}
				onDelete={handleDelete}
				onViewLog={handleViewLog}
			/>

			<NewWorkflowDialog
				open={showNewDialog}
				onOpenChange={setShowNewDialog}
				onChooseScratch={() => {
					setShowNewDialog(false);
					setEditing({
						id: "",
						name: "Untitled workflow",
						enabled: false,
						trigger: { type: "" },
						actions: [],
						createdAt: Date.now(),
						updatedAt: Date.now(),
					});
				}}
				onChooseTemplate={() => {
					setShowNewDialog(false);
					setShowTemplates(true);
				}}
			/>

			<TemplatesGallery
				open={showTemplates}
				onOpenChange={setShowTemplates}
				existing={automations}
				onPick={(tpl) => {
					setShowTemplates(false);
					const existing = automations.find(
						(a) => a.name === tpl.workflow.name,
					);
					if (existing) {
						setEditing(existing);
						return;
					}
					setEditing({
						...tpl.workflow,
						id: "",
						createdAt: Date.now(),
						updatedAt: Date.now(),
					} as Automation);
				}}
			/>

			<AutomationExecutionLogPanel
				automation={logPanelFor}
				logs={logs}
				onClose={() => setLogPanelFor(null)}
			/>
		</>
	);
}
