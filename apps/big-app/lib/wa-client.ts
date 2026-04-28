// Thin URL-injecting wrapper around @aimbig/wa-client.
//
// The package itself stays framework-pure and never reads `process.env`.
// This file is the one place big-app resolves NEXT_PUBLIC_WA_CRM_URL.
// All big-app code imports `getSocket` / `createProjectSocket` from here.

"use client";

import {
	getSocket as _getSocket,
	createProjectSocket as _createProjectSocket,
	disposeSocket,
} from "@aimbig/wa-client";
import type { Socket } from "socket.io-client";

export const WA_CRM_URL =
	process.env.NEXT_PUBLIC_WA_CRM_URL ?? "http://localhost:3001";

export function getSocket(): Socket {
	return _getSocket({ url: WA_CRM_URL });
}

export function createProjectSocket(
	url: string,
	projectId?: string | null,
	accountId?: string | null,
): Socket {
	return _createProjectSocket({
		url: url || WA_CRM_URL,
		projectId,
		accountId,
	});
}

export { disposeSocket };
