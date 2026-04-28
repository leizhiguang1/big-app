"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
		productCap: 30,
		consumableCap: 0,
		serviceCap: 30,
		medicationCap: 0,
	},
	{
		id: 2,
		name: "Branch A",
		productCap: 30,
		consumableCap: 30,
		serviceCap: 30,
		medicationCap: 0,
	},
	{
		id: 3,
		name: "Branch B",
		productCap: 30,
		consumableCap: 30,
		serviceCap: 40,
		medicationCap: 0,
	},
];

function CapInput({ defaultValue }: { defaultValue: number }) {
	return (
		<Input
			type="number"
			min={0}
			max={100}
			defaultValue={defaultValue}
			className="h-8 w-20 text-center"
		/>
	);
}

export function DiscountsTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Outlet Discount Capping</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Outlet</TableHead>
								<TableHead className="w-40">Product Max Cap (%)</TableHead>
								<TableHead className="w-44">Consumable Max Cap (%)</TableHead>
								<TableHead className="w-40">Service Max Cap (%)</TableHead>
								<TableHead className="w-44 pr-6">Medication Max Cap (%)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_OUTLETS.map((outlet) => (
								<TableRow key={outlet.id}>
									<TableCell className="pl-6 font-medium">{outlet.name}</TableCell>
									<TableCell><CapInput defaultValue={outlet.productCap} /></TableCell>
									<TableCell><CapInput defaultValue={outlet.consumableCap} /></TableCell>
									<TableCell><CapInput defaultValue={outlet.serviceCap} /></TableCell>
									<TableCell className="pr-6"><CapInput defaultValue={outlet.medicationCap} /></TableCell>
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
