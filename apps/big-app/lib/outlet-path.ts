export function outletPath(outletCode: string, sub: string): string {
	const trimmed = sub.startsWith("/") ? sub : `/${sub}`;
	return `/o/${outletCode}${trimmed}`;
}
