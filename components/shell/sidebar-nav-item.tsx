"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
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
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const isActive =
		pathname === item.href || pathname.startsWith(`${item.href}/`);
	const Icon = item.icon;

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive || isPending}
				tooltip={item.label}
				className="gap-3 px-3"
			>
				<Link
					href={item.href}
					prefetch
					onClick={(e) => {
						if (isActive || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
						e.preventDefault();
						startTransition(() => {
							router.push(item.href);
						});
					}}
				>
					<Icon />
					<span>{item.label}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
