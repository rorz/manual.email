import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

// Runs the RSC/SSR environments in workerd so server code (route handlers,
// server actions) gets the real Cloudflare bindings from wrangler.jsonc —
// including the EGRESS_QUEUE producer — in dev, build, and deploy alike.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
