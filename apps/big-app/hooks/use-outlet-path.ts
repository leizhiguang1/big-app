"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { outletPath } from "@/lib/outlet-path";

export function useOutletCode(): string | null {
	const params = useParams<{ outlet?: string }>();
	return params?.outlet ?? null;
}

export function useOutletPath(): (sub: string) => string {
	const code = useOutletCode();
	return useCallback(
		(sub: string) => {
			if (!code) return sub.startsWith("/") ? sub : `/${sub}`;
			return outletPath(code, sub);
		},
		[code],
	);
}
