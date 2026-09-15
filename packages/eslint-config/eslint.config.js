import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // 1. Global Ignores (Added config files so commitlint.config.js is ignored)
  {
    ignores: [
      "**/dist",
      "**/node_modules",
      "**/.next",
      "*.config.js",
      "*.config.cjs",
      "**/components/ui/**",
    ],
  },

  // 2. BASE RECOMMENDED RULES
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. CUSTOM BASE RULES
  {
    files: ["**/*.{ts,tsx,js}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // 4. FRONTEND & ADMIN DASHBOARD: React/Vite Rules
  {
    files: [
      "packages/frontend/**/*.{ts,tsx}",
      "packages/admin-dashboard/**/*.{ts,tsx}",
      "packages/fillfeedback-npm-package/**/*.{ts,tsx}",
    ],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // 5. IGNORE SHADCN UI WARNINGS
  {
    files: ["**/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // 6. BACKEND: Node.js Rules
  {
    files: ["packages/backend/**/*.{ts,js}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  }
);