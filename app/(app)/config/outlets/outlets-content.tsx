import { NewOutletButton } from "@/components/outlets/OutletForm";
import { OutletsTable } from "@/components/outlets/OutletsTable";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";

export async function OutletsContent() {
	const ctx = await getServerContext();
	const outlets = await listOutlets(ctx);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{outlets.length} outlet{outlets.length === 1 ? "" : "s"}
				</p>
				<NewOutletButton />
			</div>
			<OutletsTable outlets={outlets} />
		</div>
	);
}
