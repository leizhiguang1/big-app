export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

export function extractSubdomain(
	host: string | null | undefined,
	rootDomain: string = ROOT_DOMAIN,
): string | null {
	if (!host) return null;
	const hostname = host.split(":")[0]?.toLowerCase().trim() ?? "";
	if (!hostname) return null;
	if (hostname === rootDomain) return null;
	const suffix = `.${rootDomain}`;
	if (!hostname.endsWith(suffix)) return null;
	const sub = hostname.slice(0, hostname.length - suffix.length);
	if (!sub || sub === "www") return null;
	return sub;
}

export function brandUrl(subdomain: string, path = "/"): string {
	const isProd = process.env.NODE_ENV === "production";
	const protocol = isProd ? "https" : "http";
	const port = isProd ? "" : ":3000";
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${protocol}://${subdomain}.${ROOT_DOMAIN}${port}${cleanPath}`;
}

export function apexUrl(path = "/"): string {
	const isProd = process.env.NODE_ENV === "production";
	const protocol = isProd ? "https" : "http";
	const port = isProd ? "" : ":3000";
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${protocol}://${ROOT_DOMAIN}${port}${cleanPath}`;
}
