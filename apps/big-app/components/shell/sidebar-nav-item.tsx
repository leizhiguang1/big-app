"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SidebarNavItemData = {
	label: string;
	href: string;
	icon: LucideIcon;
	variant?: "default" | "whatsapp";
};

export function SidebarNavItem({
	item,
	pendingHref,
	onPending,
}: {
	item: SidebarNavItemData;
	pendingHref: string | null;
	onPending: (href: string) => void;
}) {
	const pathname = usePathname();
	const routeMatches =
		pathname === item.href || pathname.startsWith(`${item.href}/`);
	const isActive = routeMatches || pendingHref === item.href;
	const Icon = item.icon;

	const whatsappClasses =
		"hover:bg-whatsapp/10 hover:text-whatsapp active:bg-whatsapp/10 active:text-whatsapp data-active:bg-whatsapp/10 data-active:text-whatsapp";

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive}
				tooltip={item.label}
				className={
					item.variant === "whatsapp"
						? `gap-3 px-3 ${whatsappClasses}`
						: "gap-3 px-3"
				}
			>
				<Link
					href={item.href}
					prefetch
					onClick={(e) => {
						if (routeMatches || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
							return;
						onPending(item.href);
					}}
				>
					<Icon />
					<span>{item.label}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
