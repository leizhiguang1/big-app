"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as mcService from "@/lib/services/medical-certificates";

export async function createMedicalCertificateAction(input: unknown) {
	const ctx = await getServerContext();
	const mc = await mcService.createMedicalCertificate(ctx, input);
	if (mc.appointment_id) {
		revalidatePath("/o/[outlet]/appointments/[ref]", "page");
	}
	revalidatePath("/o/[outlet]/customers/[id]", "page");
	return { id: mc.id, code: mc.code };
}

export async function updateMedicalCertificateAction(
	id: string,
	input: unknown,
) {
	const ctx = await getServerContext();
	const mc = await mcService.updateMedicalCertificate(ctx, id, input);
	if (mc.appointment_id) {
		revalidatePath("/o/[outlet]/appointments/[ref]", "page");
	}
	revalidatePath("/o/[outlet]/customers/[id]", "page");
	return { id: mc.id, code: mc.code };
}

export async function cancelMedicalCertificateAction(id: string) {
	const ctx = await getServerContext();
	const mc = await mcService.cancelMedicalCertificate(ctx, id);
	if (mc.appointment_id) {
		revalidatePath("/o/[outlet]/appointments/[ref]", "page");
	}
	revalidatePath("/o/[outlet]/customers/[id]", "page");
	return { id: mc.id, code: mc.code };
}
