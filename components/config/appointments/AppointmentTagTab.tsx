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

const MOCK_TAGS = [
	{ id: 1, name: "Crown", color: "#FFE6CA", active: true },
	{ id: 2, name: "Denture", color: "#AF7AB3", active: true },
	{ id: 3, name: "Extraction / MOS", color: "#F46060", active: true },
	{ id: 4, name: "Filling", color: "#FBBEDF", active: true },
	{ id: 5, name: "Implant", color: "#dfd9ff", active: true },
	{ id: 6, name: "Orthodontics", color: "#B9FFFC", active: true },
	{ id: 7, name: "Scaling", color: "#F3D179", active: true },
];

export function AppointmentTagTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<CardTitle className="text-base">Appointment Tag</CardTitle>
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
								<TableHead className="w-36">Color</TableHead>
								<TableHead className="w-24">Status</TableHead>
								<TableHead className="w-14 pr-6" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_TAGS.map((tag) => (
								<TableRow key={tag.id}>
									<TableCell className="pl-6 font-medium">{tag.name}</TableCell>
									<TableCell>
										<span
											className="inline-block rounded-full px-3 py-0.5 font-mono text-xs"
											style={{ backgroundColor: tag.color }}
										>
											{tag.color}
										</span>
									</TableCell>
									<TableCell>
										<Switch defaultChecked={tag.active} />
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
						Showing 1 to {MOCK_TAGS.length} of {MOCK_TAGS.length} entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
