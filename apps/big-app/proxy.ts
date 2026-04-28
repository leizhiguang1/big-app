import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { extractSubdomain, ROOT_DOMAIN } from "@/lib/multibrand/host";
import { resolveBrandBySubdomain } from "@/lib/multibrand/resolve";
import type { Database } from "@/lib/supabase/types";

// Routes that don't require an auth session inside a brand subdomain.
const PUBLIC_PATHS = [
	"/login",
	"/auth",
	"/forgot-password",
	"/update-password",
	"/brand-not-found",
];

const COOKIE_DOMAIN =
	process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ROOT_DOMAIN
		? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
		: undefined;

export async function proxy(request: NextRequest) {
	const host = request.headers.get("host");
	const subdomain = extractSubdomain(host, ROOT_DOMAIN);

	let brandId: string | null = null;
	let brandSubdomain: string | null = null;

	// 1. Brand resolution (only on subdomain hosts).
	if (subdomain) {
		const result = await resolveBrandBySubdomain(subdomain);

		if (result.kind === "renamed") {
			const url = request.nextUrl.clone();
			const port = url.port;
			url.host = `${result.currentSubdomain}.${ROOT_DOMAIN}`;
			if (port) url.port = port;
			return NextResponse.redirect(url, 301);
		}

		if (result.kind === "unknown") {
			const url = request.nextUrl.clone();
			url.pathname = "/brand-not-found";
			return NextResponse.rewrite(url);
		}

		if (result.kind === "error") {
			console.error(
				`[proxy] brand resolve failed for "${subdomain}":`,
				result.message,
			);
			const url = request.nextUrl.clone();
			url.pathname = "/brand-not-found";
			return NextResponse.rewrite(url);
		}

		brandId = result.brand.id;
		brandSubdomain = result.brand.subdomain;
	}

	// 2. Build response with x-brand-id injected (preserved across cookie refreshes).
	const buildResponse = () => {
		const headers = new Headers(request.headers);
		if (brandId) headers.set("x-brand-id", brandId);
		if (brandSubdomain) headers.set("x-brand-subdomain", brandSubdomain);
		return NextResponse.next({ request: { headers } });
	};

	let response = buildResponse();

	// 3. Supabase session refresh — re-reads cookies and rotates them when the
	//    access token expires. Must use getUser() (validates) not getSession().
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					response = buildResponse();
					for (const { name, value, options } of cookiesToSet) {
						response.cookies.set(name, value, {
							...options,
							...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
						});
					}
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	// 4. Auth gate — only applies inside a brand subdomain. Apex routes
	//    (/, /select-brand, /brand-not-found) are open; the pages handle their
	//    own redirects via header inspection.
	if (!subdomain) {
		return response;
	}

	const isPublic = PUBLIC_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);

	if (!user && !isPublic) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}

	if (user && pathname === "/login") {
		const url = request.nextUrl.clone();
		url.pathname = "/dashboard";
		url.search = "";
		return NextResponse.redirect(url);
	}

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|brand-not-found|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
