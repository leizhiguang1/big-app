import { CancellationsTable } from "@/components/sales/CancellationsTable";
import { getServerContext } from "@/lib/context/server";
import { listCancellations } from "@/lib/services/sales";

export async function CancellationsContent() {
	const ctx = await getServerContext();
	const cancellations = await listCancellations(ctx);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between text-muted-foreground text-sm">
				<span>
					{cancellations.length} cancellation
					{cancellations.length === 1 ? "" : "s"}
				</span>
			</div>
			<CancellationsTable cancellations={cancellations} />
		</div>
	);
}
