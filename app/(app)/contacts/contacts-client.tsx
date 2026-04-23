"use client";

import { useCallback, useEffect, useState } from "react";
import { ContactEditDialog } from "@/components/wa-contacts/ContactEditDialog";
import { ContactsTable } from "@/components/wa-contacts/ContactsTable";
import { disposeSocket, getSocket } from "@/components/chats/socket";
import type {
	CrmContact,
	CrmContactPatch,
	DuplicateSuggestion,
} from "@/components/chats/types";

export function ContactsClient() {
	const [contacts, setContacts] = useState<CrmContact[]>([]);
	const [connected, setConnected] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [editing, setEditing] = useState<CrmContact | null>(null);
	const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);

	useEffect(() => () => disposeSocket(), []);

	useEffect(() => {
		const socket = getSocket();

		const onConnect = () => {
			setConnected(true);
			socket.emit("get_crm", (list: CrmContact[]) => {
				if (Array.isArray(list)) setContacts(list);
				setLoaded(true);
			});
			socket.emit("get_duplicate_suggestions", (list: DuplicateSuggestion[]) => {
				if (Array.isArray(list)) setDuplicates(list);
			});
		};
		const onDisconnect = () => setConnected(false);
		const onCrmUpdate = (list: CrmContact[]) => {
			if (Array.isArray(list)) setContacts(list);
		};

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("crm_update", onCrmUpdate);

		if (socket.connected) onConnect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("crm_update", onCrmUpdate);
		};
	}, []);

	const handleSave = useCallback((patch: CrmContactPatch) => {
		getSocket().emit("update_crm_contact", patch);
	}, []);

	return (
		<>
			{!connected && (
				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					Connecting to WhatsApp service…
				</div>
			)}
			{duplicates.length > 0 && (
				<div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sky-900 text-sm">
					{duplicates.length} possible duplicate contact
					{duplicates.length === 1 ? "" : "s"} detected. Merge from the detail
					view.
				</div>
			)}
			<ContactsTable
				contacts={contacts}
				onEdit={setEditing}
				isLoading={!loaded && contacts.length === 0}
			/>
			<ContactEditDialog
				contact={editing}
				onClose={() => setEditing(null)}
				onSave={handleSave}
			/>
		</>
	);
}
