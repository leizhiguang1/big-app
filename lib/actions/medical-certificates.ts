"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as mcService from "@/lib/services/medical-certificates";

export async function createMedicalCertificateAction(input: unknown) {
	const ctx = await getServerContext();
	const mc = await mcService.createMedicalCertificate(ctx, input);
	revalidatePath(`/appointments/${mc.appointment_id}`);
	return { id: mc.id, code: mc.code };
}
