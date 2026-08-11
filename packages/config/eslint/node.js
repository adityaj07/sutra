import globals from "globals";
import tseslint from "typescript-eslint";

import { baseConfig } from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export default tseslint.config(...baseConfig, {
  files: ["**/*.{js,mjs,cjs,ts}"],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.bun,
    },
  },
});
