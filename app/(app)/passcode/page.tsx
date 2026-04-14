import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PasscodeContent } from "./passcode-content";

export default function PasscodePage() {
	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-semibold text-lg">Passcode</h2>
			<Suspense fallback={<TableSkeleton columns={6} rows={6} showHeader={false} />}>
				<PasscodeContent />
			</Suspense>
		</div>
	);
}
