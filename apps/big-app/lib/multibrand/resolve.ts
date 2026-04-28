export type BrandResolution =
	| {
			kind: "active";
			brand: { id: string; subdomain: string };
	  }
	| {
			kind: "renamed";
			currentSubdomain: string;
	  }
	| { kind: "unknown" }
	| { kind: "error"; message: string };

const GRACE_DAYS = 30;

type FetchInit = RequestInit & { next?: { revalidate?: number } };

async function supabaseGet<T>(path: string): Promise<T | null> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error("Supabase env vars missing in middleware runtime");
	}

	const init: FetchInit = {
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			Accept: "application/json",
		},
		// Cache brand lookups briefly at the edge to avoid hammering Supabase.
		next: { revalidate: 30 },
	};

	const res = await fetch(`${url}/rest/v1${path}`, init);
	if (!res.ok) {
		throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
	}
	const data = (await res.json()) as T[];
	return data[0] ?? null;
}

export async function resolveBrandBySubdomain(
	subdomain: string,
): Promise<BrandResolution> {
	try {
		const live = await supabaseGet<{ id: string; subdomain: string }>(
			`/brands?subdomain=eq.${encodeURIComponent(subdomain)}&is_active=eq.true&select=id,subdomain&limit=1`,
		);

		if (live) {
			return { kind: "active", brand: live };
		}

		const cutoff = new Date(
			Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();

		const history = await supabaseGet<{
			brand_id: string;
			released_at: string;
		}>(
			`/subdomain_history?subdomain=eq.${encodeURIComponent(subdomain)}&released_at=gte.${encodeURIComponent(cutoff)}&select=brand_id,released_at&order=released_at.desc&limit=1`,
		);

		if (history?.brand_id) {
			const currentBrand = await supabaseGet<{
				subdomain: string;
				is_active: boolean;
			}>(
				`/brands?id=eq.${encodeURIComponent(history.brand_id)}&select=subdomain,is_active&limit=1`,
			);

			if (
				currentBrand?.is_active &&
				currentBrand.subdomain &&
				currentBrand.subdomain !== subdomain
			) {
				return { kind: "renamed", currentSubdomain: currentBrand.subdomain };
			}
		}

		return { kind: "unknown" };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { kind: "error", message };
	}
}
