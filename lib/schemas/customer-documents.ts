import { z } from "zod";

export const CUSTOMER_DOCUMENT_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
] as const;
export type CustomerDocumentMimeType =
	(typeof CUSTOMER_DOCUMENT_MIME_TYPES)[number];

export const CUSTOMER_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const customerDocumentInputSchema = z.object({
	customer_id: z.string().uuid(),
	appointment_id: z.string().uuid().nullable(),
	uploaded_by_id: z.string().uuid().nullable(),
	storage_path: z.string().min(1).max(512),
	file_name: z.string().trim().min(1).max(255),
	mime_type: z.enum(CUSTOMER_DOCUMENT_MIME_TYPES),
	size_bytes: z
		.number()
		.int()
		.positive()
		.max(CUSTOMER_DOCUMENT_MAX_BYTES, "File too large"),
});
export type CustomerDocumentInput = z.infer<typeof customerDocumentInputSchema>;
