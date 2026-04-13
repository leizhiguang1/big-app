import { Bell, HelpCircle, Plus, Search, Settings } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AppointmentNotificationsProvider } from "@/components/notifications/AppointmentNotificationsProvider";
import { AppSidebar } from "@/components/shell/app-sidebar";
import {
	UserMenuFallback,
	UserMenuSlot,
} from "@/components/shell/user-menu";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";

export default async function AppLayout({ children }: { children: ReactNode }) {
	let initialOutletId: string | null = null;
	try {
		const ctx = await getServerContext();
		const outlets = await listOutlets(ctx);
		initialOutletId = outlets.find((o) => o.is_active)?.id ?? null;
	} catch {
		// pre-auth or fetch failure: provider will lazily pick up via localStorage
	}

	return (
		<AppointmentNotificationsProvider initialOutletId={initialOutletId}>
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0">
				<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b bg-background/80 px-3 backdrop-blur">
					<div className="ml-auto flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="Search"
							disabled
						>
							<Search className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="New sale"
							disabled
						>
							<Plus className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="Notifications"
							disabled
						>
							<Bell className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="Help"
							disabled
						>
							<HelpCircle className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="Settings"
							disabled
						>
							<Settings className="size-4" />
						</Button>
						<div className="mx-1 h-6 w-px bg-border" />
						<Suspense fallback={<UserMenuFallback />}>
							<UserMenuSlot />
						</Suspense>
					</div>
				</header>
				<main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
		</AppointmentNotificationsProvider>
	);
}
