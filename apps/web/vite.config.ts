import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

// Runs the RSC/SSR environments in workerd so server code (server actions, RSC)
// gets the real Cloudflare bindings from wrangler.jsonc — including the
// EGRESS_QUEUE producer and DB — in dev, build, and deploy alike.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      // Share D1/R2 local state with the ingress/egress Workers (which run
      // `wrangler dev --persist-to ../../.wrangler/state`), so a mailbox seeded
      // or delivered to by ingress is visible in the web app's inbox locally.
      // Note: Cloudflare Queues do NOT cross separate dev processes — compose
      // is only exercised up to the egress enqueue locally.
      persistState: { path: "../../.wrangler/state" },
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
