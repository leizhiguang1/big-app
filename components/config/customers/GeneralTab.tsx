"use client";

import { Plus, Trash2 } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Badge } from "@/components/ui/badge";
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

function LookupTableCard({
	title,
	rows,
	showCustomers = false,
	showStatus = false,
}: {
	title: string;
	rows: { id: number; name: string; customers?: number; status?: boolean }[];
	showCustomers?: boolean;
	showStatus?: boolean;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-3">
				<CardTitle className="text-base">{title}</CardTitle>
				<Button
					size="icon"
					className="size-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
				>
					<Plus className="size-3.5" />
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-6">Name</TableHead>
							{showCustomers && <TableHead className="w-28">Customers</TableHead>}
							{showStatus && <TableHead className="w-20">Status</TableHead>}
							<TableHead className="w-14 pr-6" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.id}>
								<TableCell className="pl-6 font-medium">{row.name}</TableCell>
								{showCustomers && (
									<TableCell className="text-muted-foreground text-sm">
										{row.customers ?? 0}
									</TableCell>
								)}
								{showStatus && (
									<TableCell>
										<Switch defaultChecked={row.status ?? true} />
									</TableCell>
								)}
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
				<div className="px-6 py-2 text-muted-foreground text-xs">
					Showing 1 to {rows.length} of {rows.length} entries
				</div>
			</CardContent>
		</Card>
	);
}

export function GeneralTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			{/* View Control */}
			<Card className="max-w-xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">View Control</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-3">
						<Switch />
						<span className="flex-1 text-sm">
							Link customer listing to 'Customers' menu based on logged in user
						</span>
					</div>
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs">Validation Type</p>
						<div className="flex gap-3">
							<Badge variant="default">Contact</Badge>
							<Badge variant="outline">Identification</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Lookup tables grid */}
			<div className="grid gap-4 lg:grid-cols-2">
				<LookupTableCard
					title="Department"
					rows={[{ id: 1, name: "Sales & Marketing" }]}
				/>
				<LookupTableCard
					title="Language"
					rows={[
						{ id: 1, name: "Chinese", status: true },
						{ id: 2, name: "English", status: true },
						{ id: 3, name: "Malay", status: true },
						{ id: 4, name: "Others", status: true },
					]}
					showStatus
				/>
				<LookupTableCard
					title="Occupation"
					rows={[{ id: 1, name: "Others", customers: 0, status: true }]}
					showCustomers
					showStatus
				/>
				<LookupTableCard
					title="Payor Origin"
					rows={[{ id: 1, name: "SELF PAY" }]}
				/>
				<LookupTableCard
					title="Race"
					rows={[
						{ id: 1, name: "Chinese", customers: 549, status: true },
						{ id: 2, name: "Indian", customers: 15, status: true },
						{ id: 3, name: "Malay", customers: 26, status: true },
						{ id: 4, name: "Others", customers: 30, status: true },
					]}
					showCustomers
					showStatus
				/>
				<LookupTableCard
					title="Religion"
					rows={[
						{ id: 1, name: "Buddhist", customers: 489, status: true },
						{ id: 2, name: "Christian", customers: 51, status: true },
						{ id: 3, name: "Hindu", customers: 16, status: true },
						{ id: 4, name: "Muslim", customers: 3, status: true },
						{ id: 5, name: "Others", customers: 21, status: false },
					]}
					showCustomers
					showStatus
				/>
				<LookupTableCard
					title="Reminder Method"
					rows={[
						{ id: 1, name: "Call", status: true },
						{ id: 2, name: "WhatsApp", status: true },
					]}
					showStatus
				/>
				<LookupTableCard
					title="Source"
					rows={[
						{ id: 1, name: "Advertisement", customers: 50 },
						{ id: 2, name: "Employee", customers: 1 },
						{ id: 3, name: "Facebook", customers: 460 },
						{ id: 4, name: "Friend or Family", customers: 27 },
						{ id: 5, name: "Instagram", customers: 135 },
						{ id: 6, name: "TikTok", customers: 5 },
						{ id: 7, name: "WhatsApp", customers: 1006 },
					]}
					showCustomers
				/>
			</div>
		</div>
	);
}
