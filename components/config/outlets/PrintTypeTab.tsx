"use client";

import { Pencil } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Badge } from "@/components/ui/badge";
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

const MOCK_OUTLETS = [
	{
		id: 1,
		name: "Main Outlet",
		printingSettings: "A4",
		logo: true,
		footer: true,
		signature: false,
		signatureAnnotation: false,
	},
	{
		id: 2,
		name: "Branch A",
		printingSettings: "A4",
		logo: true,
		footer: true,
		signature: false,
		signatureAnnotation: false,
	},
	{
		id: 3,
		name: "Branch B",
		printingSettings: "A4",
		logo: true,
		footer: true,
		signature: false,
		signatureAnnotation: false,
	},
];

function YesNoBadge({ value }: { value: boolean }) {
	return (
		<Badge
			variant={value ? "default" : "secondary"}
			className="min-w-[2.5rem] justify-center"
		>
			{value ? "Yes" : "No"}
		</Badge>
	);
}

export function PrintTypeTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Print Settings</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Outlet</TableHead>
								<TableHead className="w-36">Printing Settings</TableHead>
								<TableHead className="w-20">Logo</TableHead>
								<TableHead className="w-20">Footer</TableHead>
								<TableHead className="w-24">Signature</TableHead>
								<TableHead className="w-36">Signature Annotation</TableHead>
								<TableHead className="w-40 pr-6">Label Printer Settings</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_OUTLETS.map((outlet) => (
								<TableRow key={outlet.id}>
									<TableCell className="pl-6 font-medium">{outlet.name}</TableCell>
									<TableCell>
										<Badge variant="outline" className="font-mono">
											{outlet.printingSettings}
										</Badge>
									</TableCell>
									<TableCell><YesNoBadge value={outlet.logo} /></TableCell>
									<TableCell><YesNoBadge value={outlet.footer} /></TableCell>
									<TableCell><YesNoBadge value={outlet.signature} /></TableCell>
									<TableCell>
										<Badge variant="secondary" className="opacity-50">No</Badge>
									</TableCell>
									<TableCell className="pr-6">
										<Button variant="ghost" size="icon" className="size-8">
											<Pencil className="size-4 text-amber-500" />
										</Button>
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
