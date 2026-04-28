import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

const PUBLIC_PATHS = ["/login", "/auth", "/forgot-password", "/update-password"];

export async function proxy(request: NextRequest) {
	let response = NextResponse.next({ request });

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
					response = NextResponse.next({ request });
					for (const { name, value, options } of cookiesToSet) {
						response.cookies.set(name, value, options);
					}
				},
			},
		},
	);

	const {
		data: { session },
	} = await supabase.auth.getSession();
	const user = session?.user ?? null;

	const { pathname } = request.nextUrl;
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
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
