"use client";

import { Pencil, Plus, X } from "lucide-react";
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

type Employee = { id: number; name: string; initials: string };

const MOCK_OUTLETS: {
	id: number;
	name: string;
	employees: Employee[];
}[] = [
	{
		id: 1,
		name: "Main Outlet",
		employees: [
			{ id: 1, name: "Chow C.", initials: "CC" },
			{ id: 2, name: "Shao C.", initials: "SC" },
			{ id: 3, name: "Jia Ying", initials: "JY" },
		],
	},
	{ id: 2, name: "Branch A", employees: [] },
	{ id: 3, name: "Branch B", employees: [] },
];

export function DailySummaryEmailTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Daily E-mailer</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-56 pl-6">Outlet</TableHead>
								<TableHead className="pr-6">Employee</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_OUTLETS.map((outlet) => (
								<TableRow key={outlet.id}>
									<TableCell className="pl-6">
										<div className="flex items-center gap-2">
											<span className="font-medium">{outlet.name}</span>
											<Button variant="ghost" size="icon" className="size-6">
												<Pencil className="size-3 text-amber-500" />
											</Button>
										</div>
									</TableCell>
									<TableCell className="pr-6">
										{outlet.employees.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{outlet.employees.map((emp) => (
													<div
														key={emp.id}
														className="relative flex flex-col items-center gap-1"
													>
														<Button
															variant="ghost"
															size="icon"
															className="absolute -top-1 -right-1 z-10 size-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
														>
															<X className="size-3" />
														</Button>
														<div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium text-sm">
															{emp.initials}
														</div>
														<span className="text-muted-foreground text-xs">{emp.name}</span>
													</div>
												))}
											</div>
										) : (
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Button
													variant="ghost"
													size="icon"
													className="size-7 rounded-full border border-dashed"
												>
													<Plus className="size-3.5" />
												</Button>
												No employee selected
											</div>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 1 to {MOCK_OUTLETS.length} of {MOCK_OUTLETS.length} entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
