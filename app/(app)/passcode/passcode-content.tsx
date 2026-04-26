import { NewPasscodeButton } from "@/components/passcodes/PasscodeForm";
import { PasscodesTable } from "@/components/passcodes/PasscodesTable";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import { listPasscodes } from "@/lib/services/passcodes";

export async function PasscodeContent() {
	const ctx = await getServerContext();
	const [passcodes, outlets] = await Promise.all([
		listPasscodes(ctx),
		listOutlets(ctx),
	]);
	const outletOptions = outlets
		.filter((o) => o.is_active)
		.map((o) => ({ id: o.id, name: o.name }));

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{passcodes.length} passcode{passcodes.length === 1 ? "" : "s"}
				</p>
				<NewPasscodeButton outlets={outletOptions} />
			</div>
			<PasscodesTable passcodes={passcodes} />
		</div>
	);
}
