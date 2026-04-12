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
};

export function SidebarNavItem({ item }: { item: SidebarNavItemData }) {
	const pathname = usePathname();
	const isActive =
		pathname === item.href || pathname.startsWith(`${item.href}/`);
	const Icon = item.icon;

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive}
				tooltip={item.label}
				className="gap-3 px-3"
			>
				<Link href={item.href}>
					<Icon />
					<span>{item.label}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
