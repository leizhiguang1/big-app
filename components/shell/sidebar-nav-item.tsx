"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export function SidebarNavItem({ item }: { item: SidebarNavItemData }) {
	const pathname = usePathname();
	const [pending, setPending] = useState(false);
	const isActive =
		pathname === item.href || pathname.startsWith(`${item.href}/`);
	const Icon = item.icon;

	useEffect(() => {
		if (pending && isActive) setPending(false);
	}, [pending, isActive]);

	const whatsappClasses =
		"hover:bg-[#25d366]/10 hover:text-[#25d366] data-active:bg-[#25d366]/10 data-active:text-[#25d366]";

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive || pending}
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
						if (isActive || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
						setPending(true);
					}}
				>
					<Icon />
					<span>{item.label}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
