import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const LOCK_DURATIONS = [
	{ value: "1h", label: "1 Hour" },
	{ value: "2h", label: "2 Hours" },
	{ value: "3h", label: "3 Hours" },
	{ value: "4h", label: "4 Hours" },
	{ value: "8h", label: "8 Hours" },
	{ value: "never", label: "Never" },
];

export function SecurityTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Password Settings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Password Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="pwd-expiry">Password Expiry (Days)</Label>
							<p className="text-muted-foreground text-xs">
								Set to 0 to disable expiry.
							</p>
							<Input
								id="pwd-expiry"
								type="number"
								min={0}
								defaultValue={0}
								className="w-32"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="failed-attempts">Failed Login Attempts</Label>
							<p className="text-muted-foreground text-xs">
								Set to 0 to disable lockout.
							</p>
							<Input
								id="failed-attempts"
								type="number"
								min={0}
								defaultValue={0}
								className="w-32"
							/>
						</div>
					</CardContent>
				</Card>

				{/* System Lock Duration */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">System Lock Duration</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-muted-foreground text-xs">
							How long the system locks after a failed login threshold is
							reached.
						</p>
						<Select defaultValue="3h">
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LOCK_DURATIONS.map((d) => (
									<SelectItem key={d.value} value={d.value}>
										{d.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
