import { ChevronDown, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
	email,
	name,
	role,
	imageUrl,
}: {
	email: string | null;
	name?: string | null;
	role?: string | null;
	imageUrl?: string | null;
}) {
	const displayName = name?.trim() || email?.split("@")[0] || "User";
	const initials = displayName.slice(0, 2).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-11 cursor-pointer gap-2 px-2 hover:bg-accent data-[state=open]:bg-accent"
				>
					<Avatar className="size-8">
						{imageUrl && <AvatarImage src={imageUrl} alt="" />}
						<AvatarFallback className="bg-primary text-primary-foreground text-xs">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
						<span className="max-w-[140px] truncate font-medium text-sm">
							{displayName}
						</span>
						{role && (
							<span className="max-w-[140px] truncate text-muted-foreground text-xs uppercase">
								{role}
							</span>
						)}
					</div>
					<ChevronDown className="size-4 text-muted-foreground" />
					<span className="sr-only">Open user menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-60" align="end" sideOffset={8}>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-sm">{displayName}</span>
						<span className="text-muted-foreground text-xs">
							{email ?? "—"}
						</span>
						{role && (
							<span className="text-muted-foreground text-xs uppercase">
								{role}
							</span>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled>
					<User />
					Profile
				</DropdownMenuItem>
				<form action="/logout" method="post">
					<button
						type="submit"
						className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
					>
						<LogOut className="size-4" />
						Sign out
					</button>
				</form>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
