import type { NextConfig } from "next";

const supabaseHost = (() => {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!url) return null;
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
})();

const nextConfig: NextConfig = {
	transpilePackages: ["@aimbig/chat-ui", "@aimbig/wa-client"],
	experimental: {
		staleTimes: {
			dynamic: 30,
			static: 180,
		},
	},
	images: {
		remotePatterns: supabaseHost
			? [
					{
						protocol: "https",
						hostname: supabaseHost,
						pathname: "/storage/v1/object/public/media/**",
					},
				]
			: [],
	},
};

export default nextConfig;
