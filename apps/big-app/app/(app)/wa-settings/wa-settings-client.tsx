"use client";

import { useEffect, useState } from "react";
import { ChatStaffPanel } from "@/components/wa-settings/ChatStaffPanel";
import { DeveloperPanel } from "@/components/wa-settings/DeveloperPanel";
import { NotificationsPanel } from "@/components/wa-settings/NotificationsPanel";
import { StatusManagerPanel } from "@/components/wa-settings/StatusManagerPanel";
import { TagManagerPanel } from "@/components/wa-settings/TagManagerPanel";
import { WALinesPanel } from "@/components/wa-settings/WALinesPanel";
import { useMultiWA } from "@/components/chats/useMultiWA";
import { getSocket, WA_CRM_URL } from "@/components/chats/socket";
import type { CrmContact, WATeamMember } from "@/components/chats/types";

const TEAM_KEY = "wa_team_members";

function loadTeam(): WATeamMember[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(TEAM_KEY);
		return raw ? (JSON.parse(raw) as WATeamMember[]) : [];
	} catch {
		return [];
	}
}

function saveTeam(team: WATeamMember[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(TEAM_KEY, JSON.stringify(team));
	} catch {}
}

export function WaSettingsClient() {
	const {
		accounts,
		statusPerAccount,
		qrPerAccount,
		addAccount,
		updateAccount,
		removeAccount,
		requestQR,
		logoutAccount,
	} = useMultiWA({});

	const [team, setTeam] = useState<WATeamMember[]>(loadTeam);
	const [contacts, setContacts] = useState<CrmContact[]>([]);

	useEffect(() => {
		const sock = getSocket();
		const onConnect = () => {
			sock.emit("get_crm", (list: CrmContact[]) => {
				if (Array.isArray(list)) setContacts(list);
			});
		};
		const onCrmUpdate = (list: CrmContact[]) => {
			if (Array.isArray(list)) setContacts(list);
		};
		sock.on("connect", onConnect);
		sock.on("crm_update", onCrmUpdate);
		if (sock.connected) onConnect();
		return () => {
			sock.off("connect", onConnect);
			sock.off("crm_update", onCrmUpdate);
		};
	}, []);

	const handleAddTeam = (name: string) => {
		const next = [...team, { id: `m-${Date.now()}`, name }];
		setTeam(next);
		saveTeam(next);
	};

	const handleRemoveTeam = (id: string) => {
		const next = team.filter((m) => m.id !== id);
		setTeam(next);
		saveTeam(next);
	};

	const handleRenameTag = (oldTag: string, newTag: string) => {
		getSocket().emit("rename_crm_tag", { oldTag, newTag });
	};

	const handleDeleteTag = (tag: string) => {
		getSocket().emit("delete_crm_tag", { tag });
	};

	return (
		<div className="flex flex-col gap-4">
			<NotificationsPanel />
			<WALinesPanel
				accounts={accounts}
				statusPerAccount={statusPerAccount}
				qrPerAccount={qrPerAccount}
				onAddAccount={addAccount}
				onUpdateAccount={updateAccount}
				onRemoveAccount={removeAccount}
				onRequestQR={requestQR}
				onLogoutAccount={logoutAccount}
				projectBackendUrl={WA_CRM_URL}
			/>
			<ChatStaffPanel
				members={team}
				onAdd={handleAddTeam}
				onRemove={handleRemoveTeam}
			/>
			<TagManagerPanel
				contacts={contacts}
				onRenameTag={handleRenameTag}
				onDeleteTag={handleDeleteTag}
			/>
			<StatusManagerPanel />
			<DeveloperPanel />
		</div>
	);
}
