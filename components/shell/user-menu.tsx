import { LogOut, User } from "lucide-react";
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
import { getServerContext } from "@/lib/context/server";
import { mediaPublicUrl } from "@/lib/storage/urls";

export async function UserMenuSlot() {
	const ctx = await getServerContext();
	const employeeId = ctx.currentUser?.employeeId ?? null;
	let imagePath: string | null = null;
	if (employeeId) {
		const { data } = await ctx.dbAdmin
			.from("employees")
			.select("profile_image_path")
			.eq("id", employeeId)
			.maybeSingle();
		imagePath = data?.profile_image_path ?? null;
	}
	return (
		<UserMenu
			email={ctx.currentUser?.email ?? null}
			imageUrl={mediaPublicUrl(imagePath)}
		/>
	);
}

export function UserMenuFallback() {
	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-9 rounded-full p-0"
			disabled
		>
			<Avatar className="size-8">
				<AvatarFallback className="bg-muted text-xs">··</AvatarFallback>
			</Avatar>
		</Button>
	);
}

export function UserMenu({
	email,
	imageUrl,
}: {
	email: string | null;
	imageUrl?: string | null;
}) {
	const initials = (email ?? "??").split("@")[0].slice(0, 2).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-9 rounded-full p-0 data-[state=open]:bg-accent"
				>
					<Avatar className="size-8">
						{imageUrl && <AvatarImage src={imageUrl} alt="" />}
						<AvatarFallback className="bg-primary text-primary-foreground text-xs">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span className="sr-only">Open user menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" sideOffset={8}>
				<DropdownMenuLabel className="text-muted-foreground text-xs">
					Signed in as
				</DropdownMenuLabel>
				<DropdownMenuLabel className="font-normal">
					{email ?? "—"}
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
