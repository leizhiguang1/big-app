import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (
	error,
	request,
	context,
) => {
	const err = error as Error & { digest?: string; code?: string };
	console.error(
		JSON.stringify({
			type: "next.onRequestError",
			digest: err.digest ?? null,
			name: err.name,
			code: err.code ?? null,
			message: err.message,
			stack: err.stack,
			path: request.path,
			method: request.method,
			routerKind: context.routerKind,
			routePath: context.routePath,
			routeType: context.routeType,
			renderSource: context.renderSource ?? null,
			revalidateReason: context.revalidateReason ?? null,
		}),
	);
};

export const register = () => {};
