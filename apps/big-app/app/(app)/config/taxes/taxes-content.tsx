import { TaxesTable } from "@/components/taxes/TaxesTable";
import { NewTaxButton } from "@/components/taxes/TaxForm";
import { getServerContext } from "@/lib/context/server";
import { listTaxes } from "@/lib/services/taxes";

export async function TaxesContent() {
	const ctx = await getServerContext();
	const taxes = await listTaxes(ctx);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{taxes.length} tax{taxes.length === 1 ? "" : "es"}
				</p>
				<NewTaxButton />
			</div>
			<TaxesTable taxes={taxes} />
		</div>
	);
}
