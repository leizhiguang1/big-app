import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

const COOKIE_DOMAIN =
	process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ROOT_DOMAIN
		? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
		: undefined

export async function createClient() {
	const cookieStore = await cookies()

	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, {
								...options,
								...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
							})
						}
					} catch {
						// Called from a Server Component — safe to ignore if proxy refreshes the session.
					}
				},
			},
		},
	)
}
