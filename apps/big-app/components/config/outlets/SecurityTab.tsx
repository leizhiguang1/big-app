"use client";

import { Plus } from "lucide-react";
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

const MOCK_DEVICES: {
	id: number;
	macAddress: string;
	deviceName: string;
	deviceType: string;
	outletNickName: string;
}[] = [];

export function SecurityTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-3xl">
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<CardTitle className="text-base">Device Listing</CardTitle>
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
								<TableHead className="pl-6">MAC Address</TableHead>
								<TableHead>Device Name</TableHead>
								<TableHead>Device Type</TableHead>
								<TableHead className="pr-6">Outlet Nick Name</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_DEVICES.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
										There are no items at present.
									</TableCell>
								</TableRow>
							) : (
								MOCK_DEVICES.map((device) => (
									<TableRow key={device.id}>
										<TableCell className="pl-6 font-mono text-sm">{device.macAddress}</TableCell>
										<TableCell>{device.deviceName}</TableCell>
										<TableCell>{device.deviceType}</TableCell>
										<TableCell className="pr-6">{device.outletNickName}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
					<div className="px-6 py-3 text-muted-foreground text-xs">
						Showing 0 to 0 of 0 entries
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
