import type { ReactNode } from "react";
import { ConfigRail } from "@/components/config/ConfigRail";

export default function ConfigLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-[calc(100svh-8rem)] overflow-hidden rounded-xl border bg-card shadow-sm">
			<ConfigRail />
			<div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
				{children}
			</div>
		</div>
	);
}
