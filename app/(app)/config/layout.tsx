import type { ReactNode } from "react";
import { ConfigTabs } from "@/components/config/ConfigTabs";

export default function ConfigLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Config</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage outlets, taxes, and other system-wide settings.
				</p>
			</div>
			<ConfigTabs />
			{children}
		</div>
	);
}
