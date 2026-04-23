"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { disposeSocket, getSocket } from "@/components/chats/socket";
import type {
	Automation,
	AutomationExecutionLog,
} from "@/components/chats/types";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { AutomationExecutionLogPanel } from "@/components/automations/AutomationExecutionLog";
import { AutomationsTable } from "@/components/automations/AutomationsTable";
import { Button } from "@/components/ui/button";

type EditorState =
	| { mode: "closed" }
	| { mode: "new" }
	| { mode: "edit"; automation: Automation };

export function AutomationsClient() {
	const [automations, setAutomations] = useState<Automation[]>([]);
	const [connected, setConnected] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
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
		};
		const onDisconnect = () => setConnected(false);
		const onUpdate = (list: Automation[]) => {
			if (Array.isArray(list)) setAutomations(list);
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
		socket.on("execution_log", onExecLog);

		if (socket.connected) onConnect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("automations_update", onUpdate);
			socket.off("execution_log", onExecLog);
		};
	}, [logPanelFor]);

	const handleToggle = useCallback((id: string, enabled: boolean) => {
		getSocket().emit("toggle_automation", { id, enabled });
	}, []);

	const handleDelete = useCallback((id: string) => {
		getSocket().emit("delete_automation", { id });
	}, []);

	const handleSave = useCallback((workflow: Automation) => {
		getSocket().emit(
			"save_automation",
			workflow,
			(res: { ok?: boolean; id?: string }) => {
				if (res?.ok) setEditor({ mode: "closed" });
			},
		);
	}, []);

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

	return (
		<>
			{!connected && (
				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					Connecting to WhatsApp service…
				</div>
			)}
			<div className="flex justify-end">
				<Button onClick={() => setEditor({ mode: "new" })}>
					<Plus className="size-4" />
					New automation
				</Button>
			</div>
			<AutomationsTable
				automations={automations}
				isLoading={!loaded && automations.length === 0}
				onEdit={(a) => setEditor({ mode: "edit", automation: a })}
				onToggle={handleToggle}
				onDelete={handleDelete}
				onViewLog={handleViewLog}
			/>
			{editor.mode !== "closed" && (
				<AutomationEditor
					automation={editor.mode === "edit" ? editor.automation : null}
					onClose={() => setEditor({ mode: "closed" })}
					onSave={handleSave}
				/>
			)}
			<AutomationExecutionLogPanel
				automation={logPanelFor}
				logs={logs}
				onClose={() => setLogPanelFor(null)}
			/>
		</>
	);
}
