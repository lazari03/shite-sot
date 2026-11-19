import { defineConfig } from "tsup";

export default defineConfig({
  // Worker + ops scripts that run inside the production image (no tsx there).
  entry: { worker: "src/worker/index.ts", seed: "prisma/seed.ts", "admin-grant": "scripts/admin-grant.ts" },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node22",
  bundle: true,
  sourcemap: true,
  clean: true,
  // Keep node_modules external; the runtime image ships them.
  skipNodeModulesBundle: true,
  esbuildOptions(o) {
    o.conditions = ["react-server", "node"];
  },
});
