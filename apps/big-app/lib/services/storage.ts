import type { Context } from "@/lib/context/types";
import { ValidationError } from "@/lib/errors";

export const BUCKETS = {
	media: "media",
	documents: "documents",
} as const;

export type BucketId = (typeof BUCKETS)[keyof typeof BUCKETS];

export type MediaEntity =
	| "employees"
	| "customers"
	| "services"
	| "outlets"
	| "products"
	| "brands";

const EXT_FROM_MIME: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf",
};

function extFromFilename(filename: string): string {
	const dot = filename.lastIndexOf(".");
	if (dot === -1) return "bin";
	return filename.slice(dot + 1).toLowerCase();
}

function sanitizeExt(ext: string): string {
	return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
}

function yyyymmdd(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}${m}${d}`;
}

export function buildEntityPath(args: {
	entity: MediaEntity;
	entityId: string;
	filename: string;
	mime?: string;
}): string {
	const { entity, entityId, filename, mime } = args;
	const ext = sanitizeExt(
		(mime && EXT_FROM_MIME[mime]) ?? extFromFilename(filename),
	);
	const uuid = crypto.randomUUID();
	return `${entity}/${entityId}/${yyyymmdd(new Date())}-${uuid}.${ext}`;
}

export function buildCustomerDocumentPath(args: {
	customerId: string;
	filename: string;
	mime?: string;
}): string {
	const { customerId, filename, mime } = args;
	const ext = sanitizeExt(
		(mime && EXT_FROM_MIME[mime]) ?? extFromFilename(filename),
	);
	const uuid = crypto.randomUUID();
	return `customers/${customerId}/${yyyymmdd(new Date())}-${uuid}.${ext}`;
}

export function getPublicUrl(
	ctx: Context,
	bucket: BucketId,
	path: string,
): string {
	const { data } = ctx.db.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}

/**
 * Resolve a `media`-bucket storage path to its public URL without needing
 * a request context. Used by printables (MC, invoice, receipt) where logos
 * are rendered as `<img src>` in server-rendered HTML.
 */
export function publicMediaUrl(path: string | null | undefined): string | null {
	if (!path) return null;
	const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!base) return null;
	return `${base}/storage/v1/object/public/media/${path}`;
}

export async function createSignedUploadUrl(
	ctx: Context,
	bucket: BucketId,
	path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
	const { data, error } = await ctx.db.storage
		.from(bucket)
		.createSignedUploadUrl(path);
	if (error || !data) {
		throw new ValidationError(error?.message ?? "Failed to create upload URL");
	}
	return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

export async function createSignedReadUrl(
	ctx: Context,
	bucket: BucketId,
	path: string,
	expiresIn = 60 * 10,
): Promise<string> {
	const { data, error } = await ctx.db.storage
		.from(bucket)
		.createSignedUrl(path, expiresIn);
	if (error || !data) {
		throw new ValidationError(error?.message ?? "Failed to sign read URL");
	}
	return data.signedUrl;
}

export async function createSignedReadUrls(
	ctx: Context,
	bucket: BucketId,
	paths: string[],
	expiresIn = 60 * 10,
): Promise<Record<string, string>> {
	if (paths.length === 0) return {};
	const { data, error } = await ctx.db.storage
		.from(bucket)
		.createSignedUrls(paths, expiresIn);
	if (error || !data) {
		throw new ValidationError(error?.message ?? "Failed to sign read URLs");
	}
	const out: Record<string, string> = {};
	for (const row of data) {
		if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
	}
	return out;
}

export async function deleteObject(
	ctx: Context,
	bucket: BucketId,
	path: string,
): Promise<void> {
	const { error } = await ctx.db.storage.from(bucket).remove([path]);
	if (error) throw new ValidationError(error.message);
}
