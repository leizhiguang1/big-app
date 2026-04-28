import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type CurrentUser = {
	id: string;
	employeeId: string | null;
	email: string;
};

export type Context = {
	db: SupabaseClient<Database>;
	dbAdmin: SupabaseClient<Database>;
	currentUser: CurrentUser | null;
	brandId: string | null;
	outletIds: string[];
	requestId: string;
};
