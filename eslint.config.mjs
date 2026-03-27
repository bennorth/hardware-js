// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  extends: [eslint.configs.recommended, tseslint.configs.recommended],
  rules: {
    eqeqeq: ["error", "always", { null: "ignore" }],
    // The codebase uses "let" to highlight that an object will be
    // mutated, even if the binding itself is unchanged.
    "prefer-const": 0,
    // Allow suitably-named args to be unused.
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
});
