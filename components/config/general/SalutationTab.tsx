"use client";

import { Plus, Trash2 } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// Placeholder — will come from a `salutations` DB table when implemented
const MOCK_SALUTATIONS = [
	{ id: 1, name: "DR", active: true },
	{ id: 2, name: "MR", active: true },
	{ id: 3, name: "MRS", active: true },
	{ id: 4, name: "MS", active: true },
];

export function SalutationTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<CardTitle className="text-base">Salutation</CardTitle>
					<Button size="sm" variant="outline" className="gap-1.5">
						<Plus className="size-3.5" />
						Add
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Name</TableHead>
								<TableHead className="w-28">Status</TableHead>
								<TableHead className="w-16 pr-6" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_SALUTATIONS.map((s) => (
								<TableRow key={s.id}>
									<TableCell className="pl-6 font-medium">{s.name}</TableCell>
									<TableCell>
										<Switch defaultChecked={s.active} />
									</TableCell>
									<TableCell className="pr-6">
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-destructive hover:text-destructive"
										>
											<Trash2 className="size-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 1 to {MOCK_SALUTATIONS.length} of {MOCK_SALUTATIONS.length}{" "}
						entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
