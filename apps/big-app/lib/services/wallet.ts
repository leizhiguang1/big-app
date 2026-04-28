import type { Context } from "@/lib/context/types";
import { ValidationError } from "@/lib/errors";
import { assertBrandId } from "@/lib/supabase/query";
import type { Tables } from "@/lib/supabase/types";

export type CustomerWallet = Tables<"customer_wallets">;
export type WalletTransaction = Tables<"wallet_transactions">;
export type WalletAllocation = Tables<"wallet_allocations">;

export type WalletTransactionWithRefs = WalletTransaction & {
	sales_order: { id: string; so_number: string } | null;
	created_by_employee: {
		id: string;
		first_name: string;
		last_name: string | null;
	} | null;
};

export async function getWalletByCustomer(
	ctx: Context,
	customerId: string,
): Promise<CustomerWallet | null> {
	const { data, error } = await ctx.db
		.from("customer_wallets")
		.select("*")
		.eq("brand_id", assertBrandId(ctx))
		.eq("customer_id", customerId)
		.maybeSingle();
	if (error) throw new ValidationError(error.message);
	return data;
}

export async function listWalletTransactions(
	ctx: Context,
	customerId: string,
	opts: { limit?: number } = {},
): Promise<WalletTransactionWithRefs[]> {
	const wallet = await getWalletByCustomer(ctx, customerId);
	if (!wallet) return [];
	const { data, error } = await ctx.db
		.from("wallet_transactions")
		.select(
			"*, sales_order:sales_orders!wallet_transactions_sales_order_id_fkey(id, so_number), created_by_employee:employees!wallet_transactions_created_by_fkey(id, first_name, last_name)",
		)
		.eq("wallet_id", wallet.id)
		.order("created_at", { ascending: false })
		.limit(opts.limit ?? 200);
	if (error) throw new ValidationError(error.message);
	return (data ?? []) as unknown as WalletTransactionWithRefs[];
}
