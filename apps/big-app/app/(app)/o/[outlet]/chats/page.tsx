import { notFound } from "next/navigation";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import { ChatsClient } from "./chats-client";

export const dynamic = "force-dynamic";

export default async function ChatsPage({
	params,
}: {
	params: Promise<{ outlet: string }>;
}) {
	const { outlet: outletCode } = await params;
	const ctx = await getServerContext();
	const outlets = await listOutlets(ctx);
	const current = outlets.find((o) => o.code === outletCode && o.is_active);
	if (!current) notFound();

	return (
		<div className="-mx-4 -my-4 flex min-h-0 flex-1 md:-mx-6 md:-my-6">
			<ChatsClient outletId={current.id} />
		</div>
	);
}
