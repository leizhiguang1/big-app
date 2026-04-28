"use client";

import { io, type Socket } from "socket.io-client";

export const WA_CRM_URL =
	process.env.NEXT_PUBLIC_WA_CRM_URL ?? "http://localhost:3001";

let _socket: Socket | null = null;

export function getSocket(): Socket {
	if (!_socket) {
		_socket = io(WA_CRM_URL, {
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

export function createProjectSocket(
	url: string,
	projectId?: string | null,
	accountId?: string | null,
): Socket {
	return io(url || WA_CRM_URL, {
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
