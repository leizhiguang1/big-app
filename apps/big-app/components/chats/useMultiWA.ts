"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createProjectSocket, WA_CRM_URL } from "@/lib/wa-client";
import type {
	ConnectionStatus,
	ConnectionUpdate,
	FormattedChat,
	ProfilePicsUpdate,
	WAAccount,
} from "@aimbig/wa-client";
import type { Socket } from "socket.io-client";

const ACCOUNT_COLORS = [
	"#00a884",
	"#4caf50",
	"#9c27b0",
	"#2196f3",
	"#ff9800",
	"#e91e63",
];

export function accountColor(index: number): string {
	return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

const resolvedGroupNames = new Set<string>();

type Options = {
	defaultUrl?: string;
	projectId?: string;
};

export function useMultiWA({ defaultUrl, projectId }: Options = {}) {
	const DEFAULT_URL = defaultUrl || WA_CRM_URL;
	const brandKey = projectId || "default";
	const DEFAULT_ACCOUNT_ID = brandKey;
	const STORAGE_KEY = `wa_accounts_${brandKey}_${(defaultUrl || "default").replace(/[^a-z0-9]/gi, "_")}`;

	const loadAccounts = useCallback((): WAAccount[] => {
		if (typeof window === "undefined") {
			return [{ id: DEFAULT_ACCOUNT_ID, label: "Main Line", url: DEFAULT_URL }];
		}
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			const saved = raw ? JSON.parse(raw) : null;
			if (Array.isArray(saved) && saved.length) {
				return saved.map((a: WAAccount) =>
					a.id === DEFAULT_ACCOUNT_ID ? { ...a, url: DEFAULT_URL } : a,
				);
			}
		} catch {}
		return [{ id: DEFAULT_ACCOUNT_ID, label: "Main Line", url: DEFAULT_URL }];
	}, [DEFAULT_ACCOUNT_ID, DEFAULT_URL, STORAGE_KEY]);

	const [accounts, setAccounts] = useState<WAAccount[]>(loadAccounts);
	const [chatsPerAccount, setChatsPerAccount] = useState<
		Record<string, FormattedChat[]>
	>({});
	const [statusPerAccount, setStatusPerAccount] = useState<
		Record<string, ConnectionStatus>
	>({});
	const [qrPerAccount, setQrPerAccount] = useState<Record<string, string>>({});
	const [picsPerAccount, setPicsPerAccount] = useState<
		Record<string, ProfilePicsUpdate>
	>({});

	const socketsRef = useRef<Record<string, Socket>>({});
	const accountsRef = useRef<WAAccount[]>(accounts);
	const mountedRef = useRef(true);
	const connectingTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
		{},
	);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		accountsRef.current = accounts;
	}, [accounts]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
		} catch {}
	}, [accounts, STORAGE_KEY]);

	useEffect(() => {
		const currentIds = new Set(accounts.map((a) => a.id));

		for (const [id, sock] of Object.entries(socketsRef.current)) {
			if (!currentIds.has(id)) {
				sock.removeAllListeners();
				sock.disconnect();
				delete socketsRef.current[id];
			}
		}

		accounts.forEach((account, idx) => {
			if (socketsRef.current[account.id]) return;

			const sock = createProjectSocket(account.url, projectId, account.id);
			socketsRef.current[account.id] = sock;

			const aid = account.id;
			const isPrimary = idx === 0;

			const fetchInitial = () => {
				sock.emit("get_chats");
			};

			sock.on("connect", () => {
				if (!mountedRef.current) return;
				fetchInitial();
				sock.emit(
					"get_line_label",
					(res: { ok: boolean; lineLabel?: string }) => {
						if (!mountedRef.current || !res?.ok) return;
						if (res.lineLabel) {
							setAccounts((prev) =>
								prev.map((a) =>
									a.id === aid ? { ...a, label: res.lineLabel as string } : a,
								),
							);
						}
					},
				);
				if (isPrimary) {
					sock.emit(
						"list_peer_tenants",
						(res: {
							ok?: boolean;
							peers?: Array<{
								tenantKey: string;
								lineLabel?: string;
								displayName?: string;
								waPhone?: string;
								status?: string;
							}>;
						}) => {
							if (!mountedRef.current || !res?.ok || !Array.isArray(res.peers))
								return;
							if (!res.peers.length) return;
							setAccounts((prev) => {
								const serverLines = res.peers!.map((p) => {
									const existing = prev.find((a) => a.id === p.tenantKey);
									return {
										id: p.tenantKey,
										label:
											p.lineLabel ||
											p.displayName ||
											existing?.label ||
											(p.waPhone ? `+${p.waPhone}` : "WA Line"),
										url: existing?.url || DEFAULT_URL,
										outlet: existing?.outlet || "",
									};
								});
								const connectedIdx = res.peers!.findIndex(
									(p) => p.status === "open",
								);
								if (connectedIdx > 0) {
									const [connected] = serverLines.splice(connectedIdx, 1);
									serverLines.unshift(connected);
								}
								return serverLines;
							});
						},
					);
				}
			});

			sock.on(
				"line_label_updated",
				({ tenantKey: tk, lineLabel }: { tenantKey: string; lineLabel?: string }) => {
					if (!mountedRef.current) return;
					setAccounts((prev) =>
						prev.map((a) =>
							a.id === tk ? { ...a, label: lineLabel || a.label } : a,
						),
					);
				},
			);

			sock.on(
				"peer_line_removed",
				({ tenantKey: removedKey }: { tenantKey: string }) => {
					if (!mountedRef.current) return;
					const deadSock = socketsRef.current[removedKey];
					if (deadSock) {
						deadSock.removeAllListeners();
						deadSock.disconnect();
						delete socketsRef.current[removedKey];
					}
					setAccounts((prev) => prev.filter((a) => a.id !== removedKey));
				},
			);

			sock.on("disconnect", () => {
				if (!mountedRef.current) return;
				if (!connectingTimerRef.current[aid]) {
					connectingTimerRef.current[aid] = setTimeout(() => {
						delete connectingTimerRef.current[aid];
						if (mountedRef.current)
							setStatusPerAccount((prev) => ({ ...prev, [aid]: "close" }));
					}, 4000);
				}
			});

			sock.on("connection_update", ({ status }: ConnectionUpdate) => {
				if (!mountedRef.current || !status) return;
				if (status === "open") {
					if (connectingTimerRef.current[aid]) {
						clearTimeout(connectingTimerRef.current[aid]);
						delete connectingTimerRef.current[aid];
					}
					setStatusPerAccount((prev) => ({ ...prev, [aid]: "open" }));
					setQrPerAccount((prev) => {
						const n = { ...prev };
						delete n[aid];
						return n;
					});
				} else if (status === "connecting" || status === "close") {
					if (!connectingTimerRef.current[aid]) {
						connectingTimerRef.current[aid] = setTimeout(() => {
							delete connectingTimerRef.current[aid];
							if (mountedRef.current)
								setStatusPerAccount((prev) => ({ ...prev, [aid]: status }));
						}, 4000);
					}
				} else {
					if (connectingTimerRef.current[aid]) {
						clearTimeout(connectingTimerRef.current[aid]);
						delete connectingTimerRef.current[aid];
					}
					setStatusPerAccount((prev) => ({ ...prev, [aid]: status }));
				}
			});

			sock.on("qr", (dataUrl: string) => {
				if (!mountedRef.current) return;
				setQrPerAccount((prev) => ({ ...prev, [aid]: dataUrl }));
				setStatusPerAccount((prev) => ({ ...prev, [aid]: "qr" }));
			});

			sock.on("chats_upsert", (updatedChats: FormattedChat[]) => {
				if (!mountedRef.current) return;
				setChatsPerAccount((prev) => ({ ...prev, [aid]: updatedChats }));
				for (const chat of updatedChats) {
					if (
						chat.isGroup &&
						(!chat.name || chat.name.includes("@")) &&
						!resolvedGroupNames.has(chat.id)
					) {
						resolvedGroupNames.add(chat.id);
						sock.emit("resolve_group_name", { jid: chat.id });
					}
				}
			});

			sock.on("profile_pics_update", (pics: ProfilePicsUpdate) => {
				if (!mountedRef.current) return;
				setPicsPerAccount((prev) => ({
					...prev,
					[aid]: { ...(prev[aid] || {}), ...pics },
				}));
			});

			fetchInitial();
		});
	}, [accounts, projectId, DEFAULT_URL]);

	useEffect(() => {
		return () => {
			for (const sock of Object.values(socketsRef.current)) {
				sock.removeAllListeners();
				sock.disconnect();
			}
			socketsRef.current = {};
			for (const t of Object.values(connectingTimerRef.current)) clearTimeout(t);
			connectingTimerRef.current = {};
		};
	}, []);

	const allChats = Object.values(chatsPerAccount)
		.flat()
		.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

	const allProfilePics = Object.values(picsPerAccount).reduce<ProfilePicsUpdate>(
		(acc, p) => ({ ...acc, ...p }),
		{},
	);

	const addAccount = useCallback(
		(label: string, url: string, outlet = ""): string => {
			const id = `acct-${Date.now()}`;
			setAccounts((prev) => [...prev, { id, label, url, outlet }]);
			return id;
		},
		[],
	);

	const removeAccount = useCallback((id: string) => {
		const sock = socketsRef.current[id];
		if (sock) {
			sock.emit("remove_line");
			sock.removeAllListeners();
			sock.disconnect();
			delete socketsRef.current[id];
		}
		setAccounts((prev) => prev.filter((a) => a.id !== id));
	}, []);

	const updateAccount = useCallback(
		(id: string, updates: Partial<WAAccount>) => {
			setAccounts((prev) =>
				prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
			);
			if (updates.label !== undefined && socketsRef.current[id]) {
				socketsRef.current[id].emit("set_line_label", updates.label);
			}
		},
		[],
	);

	const getAccountSocket = useCallback((accountId: string): Socket | null => {
		return (
			socketsRef.current[accountId] ??
			socketsRef.current[accountsRef.current[0]?.id] ??
			null
		);
	}, []);

	const getPrimarySocket = useCallback((): Socket | null => {
		return socketsRef.current[accountsRef.current[0]?.id] ?? null;
	}, []);

	const requestQR = useCallback((accountId: string) => {
		socketsRef.current[accountId]?.emit("request_qr");
	}, []);

	const logoutAccount = useCallback((accountId: string) => {
		socketsRef.current[accountId]?.emit("logout_wa");
	}, []);

	return {
		accounts,
		addAccount,
		removeAccount,
		updateAccount,
		allChats,
		allProfilePics,
		statusPerAccount,
		qrPerAccount,
		getAccountSocket,
		getPrimarySocket,
		requestQR,
		logoutAccount,
	};
}
