import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Seed/count tests share this disposable database; avoid inter-file mutations.
    fileParallelism: false,
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts", "tests/**/*test*.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
