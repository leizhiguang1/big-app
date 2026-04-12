"use client";

import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-9 rounded-full p-0 data-[state=open]:bg-accent"
				>
					<Avatar className="size-8">
						<AvatarFallback className="bg-primary text-primary-foreground text-xs">
							AD
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
					admin@big.app
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled>
					<User />
					Profile
				</DropdownMenuItem>
				<DropdownMenuItem disabled>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
