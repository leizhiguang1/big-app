"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const outlets = [
	{ id: "main", label: "Main Clinic" },
	{ id: "branch2", label: "Branch 2" },
	{ id: "all", label: "All Outlets" },
];

export function OutletSelector() {
	const [selectedId, setSelectedId] = useState("main");
	const selected = outlets.find((o) => o.id === selectedId) ?? outlets[0];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<Building2 className="size-4" />
					<span className="hidden sm:inline">{selected.label}</span>
					<ChevronDown className="size-4 opacity-60" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				<DropdownMenuLabel className="text-muted-foreground text-xs">
					Outlet
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{outlets.map((outlet) => (
					<DropdownMenuItem
						key={outlet.id}
						onSelect={() => setSelectedId(outlet.id)}
					>
						<Building2 />
						<span className="flex-1">{outlet.label}</span>
						{outlet.id === selectedId && <Check className="size-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
