import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { createServerFnIdGenerator } from "./src/utils/server-fn-id.ts";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const umamiScriptUrl = env.VITE_UMAMI_SCRIPT_URL?.trim();
	const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID?.trim();
	const serverFnSalt = env.VITE_SERVER_FN_SALT?.trim();
	const generateFunctionId = createServerFnIdGenerator(
		serverFnSalt ? { salt: serverFnSalt } : undefined
	);
	return {
		server: {
			port: 3001
		},
		resolve: {
			tsconfigPaths: true
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks(id: string) {
						if (
							id.includes("node_modules/react") ||
							id.includes("node_modules/react-dom")
						) {
							return "vendor";
						}
						if (
							id.includes("node_modules/@tanstack/react-router") ||
							id.includes("node_modules/@tanstack/react-query")
						) {
							return "router";
						}
						if (id.includes("node_modules/recharts")) {
							return "charts";
						}
						if (id.includes("node_modules/react-joyride")) {
							return "tour";
						}
					}
				}
			}
		},
		plugins: [
			...(umamiScriptUrl && umamiWebsiteId
				? [
						{
							name: "inject-umami",
							transformIndexHtml(html: string) {
								return html.replace(
									"</head>",
									`<script defer src="${umamiScriptUrl}" data-website-id="${umamiWebsiteId}"></script></head>`
								);
							},
							apply: "build" as const
						}
					]
				: []),
			devtools(),
			nitro({ rollupConfig: { external: [/^@sentry\//] } }),
			tailwindcss(),
			tanstackStart({
				spa: { enabled: true },
				prerender: { filter: () => false },
				srcDirectory: "src",
				serverFns: { generateFunctionId },
				server: { build: { staticNodeEnv: false } }
			}),
			viteReact(),
			babel({ presets: [reactCompilerPreset()] }),
			VitePWA({
				registerType: "autoUpdate",
				includeAssets: [
					"favicon.ico",
					"clinic-logo-200.webp",
					"dr-hazem-avatar-400.webp"
				],
				manifest: {
					name: "د. حازم — طب الأطفال والرضاعة | Smart Clinic",
					short_name: "Smart Clinic",
					description:
						"Pediatric & Neonatal Clinic Management and Lactation Care (Hurghada)",
					lang: "ar",
					dir: "rtl",
					start_url: "/",
					display: "standalone",
					background_color: "#faf6ef",
					theme_color: "#5c8d5e"
				},
				workbox: {
					globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
					navigateFallbackDenylist: [/^\/api\//]
				},
				pwaAssets: { disabled: true },
				devOptions: { enabled: false }
			})
		]
	};
});
