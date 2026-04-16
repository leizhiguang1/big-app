"use client";

import { Clock, Receipt, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/shell/user-menu";

export function AppTopbar({
	email,
	name,
	role,
	imageUrl,
	hasPin,
}: {
	email: string | null;
	name: string | null;
	role: string | null;
	imageUrl: string | null;
	hasPin: boolean;
}) {
	return (
		<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b bg-background/80 px-3 backdrop-blur">
			<TooltipProvider delayDuration={200}>
				<div className="ml-auto flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="icon"
								className="size-9 cursor-pointer bg-yellow-100 text-yellow-900 shadow-sm hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:hover:bg-yellow-500/30"
								aria-label="Clock In/Out"
							>
								<Clock className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Clock In/Out</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="icon"
								className="size-9 cursor-pointer shadow-sm"
								aria-label="Queue Display"
							>
								<Users className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Queue Display</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="icon"
								className="size-9 cursor-pointer shadow-sm"
								aria-label="Manual Transaction"
							>
								<Receipt className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Manual Transaction</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="icon"
								className="size-9 cursor-pointer shadow-sm"
								aria-label="New Sale"
							>
								<ShoppingCart className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>New Sale</TooltipContent>
					</Tooltip>
					<div className="mx-1 h-6 w-px bg-border" />
					<UserMenu
						email={email}
						name={name}
						role={role}
						imageUrl={imageUrl}
						hasPin={hasPin}
					/>
				</div>
			</TooltipProvider>
		</header>
	);
}
