import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Only the pure math/logic modules under src/ are unit-tested here (no React Native
// runtime, no Expo native modules — those need the app itself, not a test runner).
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
    },
    resolve: {
        alias: {
            "@": path.resolve(dirname, "./src"),
        },
    },
});
