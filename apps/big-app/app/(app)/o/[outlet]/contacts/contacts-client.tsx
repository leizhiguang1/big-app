"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContactEditDialog } from "@/components/wa-contacts/ContactEditDialog";
import { ContactsTable } from "@/components/wa-contacts/ContactsTable";
import { DuplicatesBanner } from "@/components/wa-contacts/DuplicatesBanner";
import { MergeContactsDialog } from "@/components/wa-contacts/MergeContactsDialog";
import { MergeUndoToast } from "@/components/wa-contacts/MergeUndoToast";
import { TagFilterBar } from "@/components/wa-contacts/TagFilterBar";
import { disposeSocket, getSocket } from "@/lib/wa-client";
import type {
	CrmContact,
	CrmContactPatch,
	DuplicateSuggestion,
} from "@aimbig/wa-client";

type MergeRequest = {
	primaryJid: string;
	secondaryPreset?: string | null;
};

const UNDO_SECONDS = 10;

export function ContactsClient() {
	const [contacts, setContacts] = useState<CrmContact[]>([]);
	const [connected, setConnected] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [editing, setEditing] = useState<CrmContact | null>(null);
	const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);
	const [tagFilter, setTagFilter] = useState<string | null>(null);
	const [mergeReq, setMergeReq] = useState<MergeRequest | null>(null);
	const [undoState, setUndoState] = useState<{
		primaryJid: string;
		secondaryJid: string;
		countdown: number;
	} | null>(null);
	const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => () => disposeSocket(), []);

	useEffect(() => {
		const socket = getSocket();

		const onConnect = () => {
			setConnected(true);
			socket.emit("get_crm", (list: CrmContact[]) => {
				if (Array.isArray(list)) setContacts(list);
				setLoaded(true);
			});
			socket.emit(
				"get_duplicate_suggestions",
				(list: DuplicateSuggestion[]) => {
					if (Array.isArray(list)) setDuplicates(list);
				},
			);
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

	useEffect(() => {
		return () => {
			if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
		};
	}, []);

	const handleSave = useCallback((patch: CrmContactPatch) => {
		getSocket().emit("update_crm_contact", patch);
	}, []);

	const allTags = useMemo(() => {
		const set = new Set<string>();
		contacts.forEach((c) => c.tags?.forEach((t) => set.add(t)));
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [contacts]);

	const filteredContacts = useMemo(() => {
		if (!tagFilter) return contacts;
		return contacts.filter((c) => c.tags?.includes(tagFilter));
	}, [contacts, tagFilter]);

	const cancelUndo = useCallback(() => {
		if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
		undoIntervalRef.current = null;
		setUndoState(null);
	}, []);

	const startMergeWithUndo = useCallback(
		(primaryJid: string, secondaryJid: string) => {
			if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
			let remaining = UNDO_SECONDS;
			setUndoState({ primaryJid, secondaryJid, countdown: remaining });
			undoIntervalRef.current = setInterval(() => {
				remaining -= 1;
				if (remaining <= 0) {
					if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
					undoIntervalRef.current = null;
					getSocket().emit("merge_crm_contacts", {
						primaryJid,
						secondaryJid,
					});
					setUndoState(null);
				} else {
					setUndoState((prev) =>
						prev ? { ...prev, countdown: remaining } : null,
					);
				}
			}, 1000);
		},
		[],
	);

	return (
		<>
			{!connected && (
				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
					Connecting to WhatsApp service…
				</div>
			)}

			<DuplicatesBanner
				suggestions={duplicates}
				onMerge={(primary, secondary) =>
					setMergeReq({ primaryJid: primary, secondaryPreset: secondary })
				}
			/>

			<TagFilterBar
				allTags={allTags}
				selectedTag={tagFilter}
				onSelect={setTagFilter}
			/>

			<ContactsTable
				contacts={filteredContacts}
				onEdit={setEditing}
				onMerge={(jid) => setMergeReq({ primaryJid: jid })}
				isLoading={!loaded && contacts.length === 0}
			/>

			<ContactEditDialog
				contact={editing}
				onClose={() => setEditing(null)}
				onSave={handleSave}
			/>

			<MergeContactsDialog
				contacts={contacts}
				primaryJid={mergeReq?.primaryJid ?? null}
				secondaryJidPreset={mergeReq?.secondaryPreset ?? null}
				onClose={() => setMergeReq(null)}
				onConfirm={(primary, secondary) =>
					startMergeWithUndo(primary, secondary)
				}
			/>

			{undoState && (
				<MergeUndoToast
					countdown={undoState.countdown}
					onUndo={cancelUndo}
				/>
			)}
		</>
	);
}
