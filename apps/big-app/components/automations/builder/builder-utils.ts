import type {
	AutomationAction,
	AutomationTrigger,
} from "@/components/chats/types";
import {
	ACTION_TYPES,
	triggerSummary,
} from "@/components/automations/automation-constants";

export type Path = (string | number)[];

export function makeId(): string {
	return `n-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function pathsEqual(a: Path, b: Path): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function getActionAtPath(
	actions: AutomationAction[],
	path: Path,
): AutomationAction | null {
	if (path.length === 0) return null;
	const [topIdx, branchId, subIdx] = path;
	const root = actions[topIdx as number];
	if (!root) return null;
	if (path.length === 1) return root;
	const list =
		branchId === "no" || branchId === "none"
			? ((root as { noBranch?: AutomationAction[] }).noBranch ?? [])
			: (
					(root as { segments?: { actions?: AutomationAction[] }[] }).segments?.[
						branchId === "yes"
							? 0
							: parseInt(String(branchId).replace("seg", ""), 10)
					]?.actions ?? []
				);
	return list[subIdx as number] ?? null;
}

export function blankAction(type: string): AutomationAction {
	const base = { id: makeId(), type } as AutomationAction & { type: string };
	if (type === "if_else") {
		return {
			...base,
			segments: [
				{
					condition: {
						rules: [
							{ field: "tags", operator: "contains", values: [] },
						],
					},
					actions: [],
				},
			],
			noBranch: [],
		} as unknown as AutomationAction;
	}
	if (type === "wait") {
		return { ...base, duration: 1, unit: "hours" } as unknown as AutomationAction;
	}
	if (type === "send_message") {
		return { ...base, message: "" } as unknown as AutomationAction;
	}
	if (type === "add_tag" || type === "remove_tag") {
		return { ...base, tag: "" } as unknown as AutomationAction;
	}
	if (type === "add_note") {
		return { ...base, note: "" } as unknown as AutomationAction;
	}
	if (type === "assign_user") {
		return { ...base, user: "" } as unknown as AutomationAction;
	}
	return base as AutomationAction;
}

export function actionSummary(action: AutomationAction | null): string {
	if (!action) return "";
	const a = action as AutomationAction & Record<string, unknown>;
	const label = ACTION_TYPES[a.type as string]?.label ?? a.type;
	switch (a.type) {
		case "send_message":
			return typeof a.message === "string" && a.message.trim()
				? `${label}: "${(a.message as string).slice(0, 40)}${(a.message as string).length > 40 ? "…" : ""}"`
				: `${label}: (empty)`;
		case "add_tag":
			return a.tag ? `Add tag "${a.tag}"` : "Add tag…";
		case "remove_tag":
			return a.tag ? `Remove tag "${a.tag}"` : "Remove tag…";
		case "add_note":
			return a.note ? `Note: "${(a.note as string).slice(0, 40)}…"` : "Add note…";
		case "wait":
			return `Wait ${a.duration ?? 1} ${a.unit ?? "hours"}`;
		case "assign_user":
			return a.user ? `Assign ${a.user}` : "Assign user…";
		case "if_else":
			return "If / Else branch";
		case "enable_dnd":
			return "Enable DND";
		case "disable_dnd":
			return "Disable DND";
		case "post_webhook":
			return a.url ? `POST ${(a.url as string).slice(0, 30)}…` : "POST webhook…";
		case "send_internal_notification":
			return a.message
				? `Notify staff: "${(a.message as string).slice(0, 30)}…"`
				: "Internal notification…";
		default:
			return label as string;
	}
}

export function triggerSummaryFor(trigger: AutomationTrigger | null): string {
	if (!trigger) return "Set a trigger…";
	return triggerSummary(trigger) ?? "Set a trigger…";
}
