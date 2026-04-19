"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const MOCK_LOCATIONS = [
	{
		id: 1,
		name: "Main Store Room",
		outlet: "Main Outlet",
		description: "Primary storage area",
	},
	{
		id: 2,
		name: "Display Shelf",
		outlet: "Main Outlet",
		description: "Front-of-house display stock",
	},
	{
		id: 3,
		name: "Cold Storage",
		outlet: "Branch A",
		description: "Temperature-controlled items",
	},
];

export function LocationsTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<CardTitle className="text-base">Stock Locations</CardTitle>
					<Button
						size="icon"
						className="size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
					>
						<Plus className="size-4" />
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Location Name</TableHead>
								<TableHead>Outlet</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="w-24 pr-6">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_LOCATIONS.map((loc) => (
								<TableRow key={loc.id}>
									<TableCell className="pl-6 font-medium">{loc.name}</TableCell>
									<TableCell>{loc.outlet}</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{loc.description}
									</TableCell>
									<TableCell className="pr-6">
										<div className="flex gap-1">
											<Button variant="ghost" size="icon" className="size-7">
												<Pencil className="size-3.5 text-amber-500" />
											</Button>
											<Button variant="ghost" size="icon" className="size-7">
												<Trash2 className="size-3.5 text-destructive" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 1 to {MOCK_LOCATIONS.length} of {MOCK_LOCATIONS.length} entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
