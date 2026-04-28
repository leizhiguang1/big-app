"use client";

import { Plus, Trash2 } from "lucide-react";
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

const MOCK_CATEGORIES = [
	{ id: 1, name: "Consultation", externalCode: null },
	{ id: 2, name: "Denture", externalCode: null },
	{ id: 3, name: "Diagnostic", externalCode: null },
	{ id: 4, name: "Endodontics", externalCode: null },
	{ id: 5, name: "Implant", externalCode: null },
	{ id: 6, name: "Medication", externalCode: null },
	{ id: 7, name: "Oral Surgery", externalCode: null },
	{ id: 8, name: "Orthodontic Treatment (Braces)", externalCode: null },
	{ id: 9, name: "Others", externalCode: null },
];

export function CategoryTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<CardTitle className="text-base">Category</CardTitle>
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
								<TableHead className="pl-6">Name</TableHead>
								<TableHead className="w-36">External Code</TableHead>
								<TableHead className="w-14 pr-6" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_CATEGORIES.map((cat) => (
								<TableRow key={cat.id}>
									<TableCell className="pl-6 font-medium">{cat.name}</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{cat.externalCode ?? "—"}
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
						Showing 1 to {MOCK_CATEGORIES.length} of {MOCK_CATEGORIES.length} entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
