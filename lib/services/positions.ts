import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { positionInputSchema } from "@/lib/schemas/positions";
import type { Tables } from "@/lib/supabase/types";

export type Position = Tables<"positions">;

export async function listPositions(ctx: Context): Promise<Position[]> {
	const { data, error } = await ctx.db
		.from("positions")
		.select("*")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function getPosition(ctx: Context, id: string): Promise<Position> {
	const { data, error } = await ctx.db
		.from("positions")
		.select("*")
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Position ${id} not found`);
	return data;
}

export async function createPosition(
	ctx: Context,
	input: unknown,
): Promise<Position> {
	const parsed = positionInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("positions")
		.insert({
			name: parsed.name,
			description: parsed.description || null,
			is_active: parsed.is_active,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A position with that name already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updatePosition(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Position> {
	const parsed = positionInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("positions")
		.update({
			name: parsed.name,
			description: parsed.description || null,
			is_active: parsed.is_active,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("A position with that name already exists");
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Position ${id} not found`);
	return data;
}

export async function deletePosition(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("positions").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This position is assigned to one or more employees. Reassign them first.",
			);
		throw new ValidationError(error.message);
	}
}
