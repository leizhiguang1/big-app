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

// First-segment names of routes that live under /o/<code>/. If a logged-in
// user hits one of these without the /o/<code>/ prefix (stale bookmark, hand-
// typed URL), redirect them to their primary outlet's version of the path.
const OUTLET_SCOPED_FIRST_SEG = new Set([
	"appointments",
	"customers",
	"sales",
	"dashboard",
	"services",
	"employees",
	"inventory",
	"chats",
	"contacts",
	"automations",
	"ai",
	"knowledge-base",
	"passcode",
	"reports",
	"roster",
	"voucher",
	"wa-settings",
	"webstore",
	"config",
]);

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

		// /admin/* is apex-only. A brand subdomain must never serve it.
		if (request.nextUrl.pathname.startsWith("/admin")) {
			const url = request.nextUrl.clone();
			url.pathname = "/brand-not-found";
			return NextResponse.rewrite(url, { status: 404 });
		}
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
		url.pathname = "/";
		url.search = "";
		return NextResponse.redirect(url);
	}

	// Auto-prefix a missing /o/<code>/ on stale bookmarks. e.g. /customers/abc
	// → /o/<primary>/customers/abc. Only fires when the first segment matches
	// an outlet-scoped route AND we're not already under /o/.
	if (user && brandId) {
		const firstSeg = pathname.split("/")[1] ?? "";
		if (firstSeg !== "o" && OUTLET_SCOPED_FIRST_SEG.has(firstSeg)) {
			const code = await resolveLandingOutletCode(supabase, user.id, brandId);
			if (code) {
				const url = request.nextUrl.clone();
				url.pathname = `/o/${code}${pathname}`;
				return NextResponse.redirect(url);
			}
		}
	}

	return response;
}

// Pick the outlet to land a user on when they hit a stale URL. Order:
//   1. Their primary outlet (employee_outlets.is_primary = true), if active.
//   2. Any other active outlet they're a member of, name-sorted.
//   3. Fallback: first active outlet in the brand (covers admins without any
//      employee_outlets rows yet).
async function resolveLandingOutletCode(
	supabase: ReturnType<typeof createServerClient<Database>>,
	authUserId: string,
	brandId: string,
): Promise<string | null> {
	const { data: emp } = await supabase
		.from("employees")
		.select("id")
		.eq("auth_user_id", authUserId)
		.eq("brand_id", brandId)
		.maybeSingle();

	if (emp?.id) {
		const { data: links } = await supabase
			.from("employee_outlets")
			.select("is_primary, outlets!inner(code, name, is_active)")
			.eq("employee_id", emp.id);
		const usable = (links ?? [])
			.map((l) => ({
				is_primary: l.is_primary,
				outlet: l.outlets as unknown as {
					code: string;
					name: string;
					is_active: boolean;
				},
			}))
			.filter((l) => l.outlet?.is_active)
			.sort((a, b) => {
				if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
				return a.outlet.name.localeCompare(b.outlet.name);
			});
		if (usable[0]) return usable[0].outlet.code;
	}

	const { data: fallback } = await supabase
		.from("outlets")
		.select("code")
		.eq("brand_id", brandId)
		.eq("is_active", true)
		.order("name", { ascending: true })
		.limit(1)
		.maybeSingle();
	return fallback?.code ?? null;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|brand-not-found|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
