import { Construction } from "lucide-react";

export function PlaceholderBanner() {
	return (
		<div className="mb-5 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm">
			<Construction className="size-4 shrink-0" />
			<span>
				<strong>UI preview</strong> — not yet connected to the database. Data
				shown is static placeholder.
			</span>
		</div>
	);
}
