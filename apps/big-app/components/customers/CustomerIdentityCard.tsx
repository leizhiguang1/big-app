"use client";

import {
	Crown,
	IdCard,
	Phone,
	Sparkles,
	UserCog,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOutletPath } from "@/hooks/use-outlet-path";
import type { CustomerIdentity } from "@/lib/services/customers";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

type Props = {
	customer: CustomerIdentity | null;
	size?: Size;
	showCode?: boolean;
	showPhone?: boolean;
	showIdNumber?: boolean;
	showFlags?: boolean;
	fallbackLabel?: string;
	link?: boolean;
	className?: string;
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function displayName(
	customer: CustomerIdentity | null,
	fallback: string,
): string {
	if (!customer) return fallback;
	return [customer.first_name, customer.last_name]
		.filter(Boolean)
		.join(" ")
		.trim()
		.toUpperCase();
}

const AVATAR_CLS: Record<Size, string> = {
	sm: "size-8",
	md: "size-10",
	lg: "size-14",
};

const NAME_CLS: Record<Size, string> = {
	sm: "text-sm",
	md: "text-[15px]",
	lg: "text-base",
};

export function CustomerIdentityCard({
	customer,
	size = "md",
	showCode = true,
	showPhone = false,
	showIdNumber = false,
	showFlags = false,
	fallbackLabel = "Walk-in",
	link = true,
	className,
}: Props) {
	const path = useOutletPath();
	const name = displayName(customer, fallbackLabel);
	const imageUrl = mediaPublicUrl(customer?.profile_image_path ?? null);
	const phone = customer?.phone ?? null;
	const idNumber = customer?.id_number ?? null;
	const isVip = customer?.is_vip ?? false;
	const isStaff = customer?.is_staff ?? false;
	const tag = customer?.tag ?? null;
	const hasFlags = showFlags && (isVip || isStaff || Boolean(tag));

	const NameEl =
		customer && link ? (
			<Link
				href={path(`/customers/${customer.id}`)}
				className={cn(
					"truncate font-semibold text-sky-800 leading-tight hover:underline",
					NAME_CLS[size],
				)}
			>
				{name}
			</Link>
		) : (
			<span
				className={cn(
					"truncate font-semibold leading-tight",
					customer ? "text-sky-800" : "text-muted-foreground",
					NAME_CLS[size],
				)}
			>
				{name}
			</span>
		);

	return (
		<div className={cn("flex min-w-0 items-center gap-3", className)}>
			<Avatar
				size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
				className={AVATAR_CLS[size]}
			>
				{imageUrl && <AvatarImage src={imageUrl} alt={name} />}
				<AvatarFallback>
					{customer ? (
						initials(name)
					) : (
						<UserRound className="size-1/2 text-muted-foreground" />
					)}
				</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex min-w-0 items-baseline gap-1.5">
					{NameEl}
					{showCode && customer?.code && (
						<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
							({customer.code})
						</span>
					)}
				</div>
				{showPhone && phone && (
					<div className="flex items-center gap-1 text-muted-foreground text-xs">
						<Phone className="size-3 shrink-0" />
						<span className="truncate tabular-nums">{phone}</span>
					</div>
				)}
				{showIdNumber && idNumber && (
					<div className="flex items-center gap-1 text-muted-foreground text-xs">
						<IdCard className="size-3 shrink-0" />
						<span className="truncate tabular-nums">{idNumber}</span>
					</div>
				)}
				{hasFlags && (
					<div className="mt-0.5 flex flex-wrap gap-1">
						{isVip && (
							<FlagBadge
								icon={<Crown className="size-3" />}
								label="VIP"
								className="bg-amber-100 text-amber-800"
							/>
						)}
						{isStaff && (
							<FlagBadge
								icon={<UserCog className="size-3" />}
								label="Staff"
								className="bg-sky-100 text-sky-800"
							/>
						)}
						{tag && (
							<FlagBadge
								icon={<Sparkles className="size-3" />}
								label={tag}
								className="bg-violet-100 text-violet-800"
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function FlagBadge({
	icon,
	label,
	className,
}: {
	icon: React.ReactNode;
	label: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wide",
				className,
			)}
		>
			{icon}
			{label}
		</span>
	);
}
