import { Bell, HelpCircle, Plus, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { UserMenu } from "@/components/shell/user-menu";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerContext } from "@/lib/context/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const ctx = await getServerContext();
	return (
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
						<UserMenu email={ctx.currentUser?.email ?? null} />
					</div>
				</header>
				<main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
