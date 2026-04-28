"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	APPOINTMENT_TAG_CONFIG,
	type AppointmentTagConfig,
} from "@/lib/constants/appointment-status";
import type { BrandConfigItem } from "@/lib/services/brand-config";

export type AppointmentPilotSettings = {
	defaultSlotMinutes: number;
	allowOverbook: boolean;
	hideValueOnHover: boolean;
};

const DEFAULT_PILOT_SETTINGS: AppointmentPilotSettings = {
	defaultSlotMinutes: 30,
	allowOverbook: false,
	hideValueOnHover: false,
};

type Ctx = {
	tagByCode: Map<string, AppointmentTagConfig>;
	tagList: { code: string; config: AppointmentTagConfig }[];
	settings: AppointmentPilotSettings;
};

const AppointmentConfigCtx = createContext<Ctx | null>(null);

function toHexFallback(hex: string | null): string {
	return hex ?? "#94a3b8";
}

function buildTagMap(
	rows: BrandConfigItem[],
): Map<string, AppointmentTagConfig> {
	const map = new Map<string, AppointmentTagConfig>();
	for (const row of rows) {
		if (!row.is_active) continue;
		const color = toHexFallback(row.color);
		map.set(row.code, {
			label: row.label,
			bg: `${color}33`,
			dot: color,
		});
	}
	return map;
}

export function AppointmentConfigProvider({
	tags,
	settings,
	children,
}: {
	tags: BrandConfigItem[];
	settings?: AppointmentPilotSettings;
	children: ReactNode;
}) {
	const value = useMemo<Ctx>(() => {
		const tagByCode = buildTagMap(tags);
		const tagList = [...tagByCode.entries()].map(([code, config]) => ({
			code,
			config,
		}));
		return {
			tagByCode,
			tagList,
			settings: settings ?? DEFAULT_PILOT_SETTINGS,
		};
	}, [tags, settings]);
	return (
		<AppointmentConfigCtx.Provider value={value}>
			{children}
		</AppointmentConfigCtx.Provider>
	);
}

// Tag lookup. Falls back to the hardcoded constants when the provider is
// absent or the code has been archived — so isolated screens (e.g. storybook
// or tests) and historical rows still render reasonably.
export function useAppointmentTag(code: string | null | undefined) {
	const ctx = useContext(AppointmentConfigCtx);
	if (!code) return null;
	if (ctx) {
		const row = ctx.tagByCode.get(code);
		if (row) return row;
	}
	return APPOINTMENT_TAG_CONFIG[code] ?? null;
}

// Full list of active tags (for the tag picker in AppointmentDialog). Falls
// back to the hardcoded keys/configs when the provider isn't present.
export function useAppointmentTagList(): {
	code: string;
	config: AppointmentTagConfig;
}[] {
	const ctx = useContext(AppointmentConfigCtx);
	if (ctx) return ctx.tagList;
	return Object.entries(APPOINTMENT_TAG_CONFIG).map(([code, config]) => ({
		code,
		config,
	}));
}

// Pilot shape-2 settings. Returns DEFAULT_PILOT_SETTINGS when no provider is
// present (isolated screens, tests).
export function useAppointmentPilotSettings(): AppointmentPilotSettings {
	const ctx = useContext(AppointmentConfigCtx);
	return ctx?.settings ?? DEFAULT_PILOT_SETTINGS;
}
