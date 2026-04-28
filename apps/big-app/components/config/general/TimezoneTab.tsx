import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const TIMEZONES = [
	{ value: "Asia/Kuala_Lumpur", label: "(UTC+08:00) Kuala Lumpur, Singapore" },
	{ value: "Asia/Singapore", label: "(UTC+08:00) Singapore" },
	{ value: "Asia/Manila", label: "(UTC+08:00) Manila" },
	{ value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta" },
	{ value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo, Osaka" },
	{ value: "UTC", label: "(UTC+00:00) UTC" },
];

// Placeholder outlets — will be real outlet rows once DB column lands
const MOCK_OUTLETS = [
	{ id: 1, name: "Main Outlet", nickname: "MAIN", timezone: "Asia/Kuala_Lumpur" },
	{ id: 2, name: "Branch A", nickname: "BRA", timezone: "Asia/Kuala_Lumpur" },
	{ id: 3, name: "Branch B", nickname: "BRB", timezone: "Asia/Kuala_Lumpur" },
];

export function TimezoneTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Timezone Settings</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-16 pl-6">Outlet ID</TableHead>
								<TableHead>Outlet Name</TableHead>
								<TableHead className="w-28">Nickname</TableHead>
								<TableHead className="w-72 pr-6">Time Zone</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{MOCK_OUTLETS.map((outlet) => (
								<TableRow key={outlet.id}>
									<TableCell className="pl-6 font-medium">
										{outlet.id}
									</TableCell>
									<TableCell className="font-medium">{outlet.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{outlet.nickname}
									</TableCell>
									<TableCell className="pr-6">
										<Select defaultValue={outlet.timezone}>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{TIMEZONES.map((tz) => (
													<SelectItem key={tz.value} value={tz.value}>
														{tz.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
