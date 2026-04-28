// Socket.IO connection wiring for wa-crm. Two flavors:
//
// - `getSocket()` — process-wide singleton against the default URL. Useful
//   when only one connection is needed (KB editor, AI config, etc.).
// - `createProjectSocket()` — fresh connection per WA line/account. Used
//   by `useMultiWA` to maintain N parallel sockets against potentially
//   different wa-crm tenants.
//
// Consumers must read NEXT_PUBLIC_WA_CRM_URL (or equivalent) and pass it in
// — this file deliberately does not touch `process.env` so the package
// stays framework-pure.

import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export type GetSocketOptions = {
	url: string;
};

export function getSocket({ url }: GetSocketOptions): Socket {
	if (!_socket) {
		_socket = io(url, {
			autoConnect: true,
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: Number.POSITIVE_INFINITY,
		});
	}
	return _socket;
}

export function disposeSocket(): void {
	if (_socket) {
		_socket.removeAllListeners();
		_socket.disconnect();
		_socket = null;
	}
}

export type CreateProjectSocketOptions = {
	url: string;
	projectId?: string | null;
	accountId?: string | null;
};

export function createProjectSocket({
	url,
	projectId,
	accountId,
}: CreateProjectSocketOptions): Socket {
	return io(url, {
		autoConnect: true,
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionAttempts: Number.POSITIVE_INFINITY,
		auth: {
			...(projectId ? { projectId } : {}),
			...(accountId ? { accountId } : {}),
		},
	});
}
