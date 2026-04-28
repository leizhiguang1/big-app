"use client";

import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
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

const PASSCODE_SETTINGS = [
	{
		id: 1,
		module: "Employee",
		action: "Create",
		description: "Passcode is required for users to create new employee record",
		enabled: true,
	},
	{
		id: 2,
		module: "Employee",
		action: "Edit",
		description: "Passcode is required for users to edit other employee profiles",
		enabled: true,
	},
];

export function SecurityTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Passcode Settings</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Module</TableHead>
								<TableHead className="w-28">Action</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="w-24 pr-6 text-right">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{PASSCODE_SETTINGS.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="pl-6 font-medium">{row.module}</TableCell>
									<TableCell>{row.action}</TableCell>
									<TableCell className="text-muted-foreground text-sm">{row.description}</TableCell>
									<TableCell className="pr-6 text-right">
										<Switch defaultChecked={row.enabled} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 1 to {PASSCODE_SETTINGS.length} of {PASSCODE_SETTINGS.length} entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
