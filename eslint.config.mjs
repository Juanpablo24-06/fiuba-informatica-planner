import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "sites/**",
    "apps/demo/**",
    "output/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts"
  ])
]);
