"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
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
import { Textarea } from "@/components/ui/textarea";

const MOCK_OTHER_CHARGES = [{ id: 1, name: "Others" }];

const MOCK_TAX_DETAILS = [
	{ id: 1, name: "(Local)", rate: 0, effectiveDate: "2017-01-01", currency: 0, enabled: true },
	{ id: 2, name: "(Foreigners) SST", rate: 0, effectiveDate: "2018-09-01", currency: 0, enabled: true },
];

const MOCK_OUTLETS = [
	{ id: 1, name: "Main Outlet", viewNoSales: false, editSales: false },
	{ id: 2, name: "Branch A", viewNoSales: false, editSales: false },
	{ id: 3, name: "Branch B", viewNoSales: false, editSales: false },
];

export function BillingTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Billing Options */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Billing Options</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<SettingToggleRow label="All prices of items are inclusive of tax" defaultChecked />
						<SettingToggleRow label="Auto select first Tax" hint="Automatically selects the first tax entry when adding a billing item." />
						<SettingToggleRow label="Auto assign 'FOREIGNER SST' for a customer whose Country of Origin is not Malaysia" defaultChecked />
						<SettingToggleRow label="Allow changing price in Tax to Purchase" defaultChecked />
						<SettingToggleRow label="Auto top" hint="Automatically round up the total amount." defaultChecked />
						<SettingToggleRow label="Remove invoice up for Doctor's invoice review with the status" defaultChecked />
						<SettingToggleRow label="Allow age and birthday in Remarks" defaultChecked />
						<SettingToggleRow label="Show customer address in both invoice and payment receipts" defaultChecked />
						<SettingToggleRow label="Allow discount in payment receipt" defaultChecked />
						<SettingToggleRow label="Show identification number in sales, payments and redemption screens" />
						<SettingToggleRow label="Show Item Remarks in Invoices" defaultChecked />
						<SettingToggleRow label="Show Draft 4 any Status in Invoice" defaultChecked />
						<SettingToggleRow label="Show employee assignment report day item to ensure data integrity" />
					</CardContent>
				</Card>

				<div className="flex flex-col gap-4">
					{/* Other Charges Type */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-3">
							<CardTitle className="text-base">Other Charges Type</CardTitle>
							<Button size="icon" className="size-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
								<Plus className="size-3.5" />
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-6">Name</TableHead>
										<TableHead className="w-14 pr-6" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{MOCK_OTHER_CHARGES.map((c) => (
										<TableRow key={c.id}>
											<TableCell className="pl-6 font-medium">{c.name}</TableCell>
											<TableCell className="pr-6">
												<Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive">
													<Trash2 className="size-4" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<div className="px-6 py-2 text-muted-foreground text-xs">
								Showing 1 to {MOCK_OTHER_CHARGES.length} of {MOCK_OTHER_CHARGES.length} entries
							</div>
						</CardContent>
					</Card>

					{/* Tax Details */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Tax Details</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-6">Tax Name</TableHead>
										<TableHead className="w-20">Rate (%)</TableHead>
										<TableHead className="w-32">Effective Date</TableHead>
										<TableHead className="w-20">Status</TableHead>
										<TableHead className="w-14 pr-6" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{MOCK_TAX_DETAILS.map((tax) => (
										<TableRow key={tax.id}>
											<TableCell className="pl-6 font-medium">{tax.name}</TableCell>
											<TableCell>{tax.rate}</TableCell>
											<TableCell className="text-muted-foreground text-sm">{tax.effectiveDate}</TableCell>
											<TableCell><Switch defaultChecked={tax.enabled} /></TableCell>
											<TableCell className="pr-6">
												<Button variant="ghost" size="icon" className="size-8">
													<Pencil className="size-4 text-amber-500" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<div className="px-6 py-2 text-muted-foreground text-xs">
								Showing 1 to {MOCK_TAX_DETAILS.length} of {MOCK_TAX_DETAILS.length} entries
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Sales Options */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Sales Options</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Outlet</TableHead>
								<TableHead className="w-36">View No Sales</TableHead>
								<TableHead className="w-36 pr-6">Edit Sales</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_OUTLETS.map((outlet) => (
								<TableRow key={outlet.id}>
									<TableCell className="pl-6 font-medium">{outlet.name}</TableCell>
									<TableCell><Switch defaultChecked={outlet.viewNoSales} /></TableCell>
									<TableCell className="pr-6"><Switch defaultChecked={outlet.editSales} /></TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 1 to {MOCK_OUTLETS.length} of {MOCK_OUTLETS.length} entries
					</div>
				</CardContent>
			</Card>

			{/* Terms & Conditions */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-muted-foreground text-xs">
						Personalize the contents of the Terms &amp; Conditions here. You can use placeholder tags to include dynamic information within the Terms &amp; Conditions.
					</p>
					<div className="flex gap-2">
						<Button variant="default" size="sm">Invoice &amp; Receipts</Button>
						<Button variant="outline" size="sm">Proforma Invoice</Button>
					</div>
					<Textarea
						className="min-h-32 font-mono text-sm"
						defaultValue="Goods sold are not refundable."
					/>
				</CardContent>
			</Card>
		</div>
	);
}
