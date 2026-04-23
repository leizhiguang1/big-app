"use client";

import {
	Archive,
	BarChart2,
	Calendar,
	CalendarDays,
	Contact,
	KeyRound,
	LayoutDashboard,
	MessageCircle,
	Settings,
	ShoppingCart,
	Stethoscope,
	Store,
	Ticket,
	UserCog,
	Users,
	Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	SidebarNavItem,
	type SidebarNavItemData,
} from "@/components/shell/sidebar-nav-item";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems: SidebarNavItemData[] = [
	{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ label: "Appointments", href: "/appointments", icon: Calendar },
	{ label: "Customers", href: "/customers", icon: Users },
	{ label: "Sales", href: "/sales", icon: ShoppingCart },
	{ label: "Roster", href: "/roster", icon: CalendarDays },
	{ label: "Services", href: "/services", icon: Stethoscope },
	{ label: "Inventory", href: "/inventory", icon: Archive },
	{ label: "Employees", href: "/employees", icon: UserCog },
	{ label: "Voucher", href: "/voucher", icon: Ticket },
	{ label: "Passcode", href: "/passcode", icon: KeyRound },
	{ label: "Reports", href: "/reports", icon: BarChart2 },
	{ label: "Webstore", href: "/webstore", icon: Store },
	{ label: "Config", href: "/config", icon: Settings },
];

const whatsappNavItems: SidebarNavItemData[] = [
	{ label: "Chats", href: "/chats", icon: MessageCircle, variant: "whatsapp" },
	{ label: "Contacts", href: "/contacts", icon: Contact, variant: "whatsapp" },
	{
		label: "Automations",
		href: "/automations",
		icon: Zap,
		variant: "whatsapp",
	},
];

export function AppSidebar() {
	const pathname = usePathname();
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	useEffect(() => {
		setPendingHref(null);
	}, [pathname]);

	const handlePending = useCallback((href: string) => {
		setPendingHref(href);
	}, []);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-sidebar-border border-b">
				<div className="flex min-h-12 items-center gap-2 py-2">
					<SidebarTrigger className="size-9 shrink-0" />
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-sky-500 font-bold text-primary-foreground text-xs shadow-sm group-data-[collapsible=icon]:hidden">
						KD
					</div>
					<span className="truncate font-bold text-lg text-primary group-data-[collapsible=icon]:hidden">
						BIG App
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup className="px-2 py-3">
					<SidebarGroupContent>
						<SidebarMenu className="gap-0.5">
							{navItems.map((item) => (
								<SidebarNavItem
									key={item.href}
									item={item}
									pendingHref={pendingHref}
									onPending={handlePending}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="border-sidebar-border border-t px-2 py-3">
					<SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
						WhatsApp
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="gap-0.5">
							{whatsappNavItems.map((item) => (
								<SidebarNavItem
									key={item.href}
									item={item}
									pendingHref={pendingHref}
									onPending={handlePending}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-sidebar-border border-t">
				<div className="px-3 py-2 text-[11px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
					BIG App v1.0.0
				</div>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
