"use client";

import { ComingSoonCard } from "@/components/config/ComingSoonCard";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { AutoForeignTaxForm } from "@/components/config/sales/AutoForeignTaxForm";
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
import { useOutletPath } from "@/hooks/use-outlet-path";
import type { BillingSettings } from "@/lib/services/billing-settings";
import type { Tax } from "@/lib/services/taxes";

type Props = {
	billingSettings: BillingSettings;
	taxes: Tax[];
};

export function BillingTab({ billingSettings, taxes }: Props) {
	const path = useOutletPath();
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Billing Options — auto-foreign-tax is live; the rest are scaffolded
				    for prototype parity and marked "Planned". */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Billing Options</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<AutoForeignTaxForm settings={billingSettings} taxes={taxes} />
						<SettingToggleRow
							label="All prices of items are inclusive of tax"
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Auto select first Tax"
							hint="Automatically selects the first tax entry when adding a billing item."
							disabled
						/>
						<SettingToggleRow
							label="Allow changing price in Tax to Purchase"
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Round up total amount"
							hint="Automatically round up the total amount."
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Show customer address in invoices and receipts"
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Show discount in payment receipt"
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Show identification number in sales, payments and receipts"
							disabled
						/>
						<SettingToggleRow
							label="Show item remarks in invoices"
							defaultChecked
							disabled
						/>
						<SettingToggleRow
							label="Show employee assignment per line item"
							disabled
						/>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-4">
					{/* Tax Details — read-only mirror of /config/taxes so staff see what
					    the two pickers above can pick from. */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-3">
							<CardTitle className="text-base">Tax Details</CardTitle>
							<Button asChild variant="outline" size="sm">
								<a href={path("/config/taxes")}>Manage</a>
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-6">Tax Name</TableHead>
										<TableHead className="w-20">Rate (%)</TableHead>
										<TableHead className="w-20 pr-6">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{taxes.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={3}
												className="py-4 pl-6 text-muted-foreground text-sm"
											>
												No taxes configured yet.
											</TableCell>
										</TableRow>
									) : (
										taxes.map((tax) => (
											<TableRow key={tax.id}>
												<TableCell className="pl-6 font-medium">
													{tax.name}
												</TableCell>
												<TableCell>{tax.rate_pct.toFixed(2)}</TableCell>
												<TableCell className="pr-6">
													<span
														className={
															tax.is_active
																? "text-emerald-600 text-xs"
																: "text-muted-foreground text-xs"
														}
													>
														{tax.is_active ? "Active" : "Inactive"}
													</span>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
							<div className="px-6 py-2 text-muted-foreground text-xs">
								Showing {taxes.length}{" "}
								{taxes.length === 1 ? "entry" : "entries"}
							</div>
						</CardContent>
					</Card>

					<ComingSoonCard sectionLabel="Other Charges Type" />
				</div>
			</div>

			<ComingSoonCard sectionLabel="Sales Options (per-outlet)" />
			<ComingSoonCard sectionLabel="Terms & Conditions" />
		</div>
	);
}
