import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import { baseConfig } from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export default tseslint.config(
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...reactPlugin.configs.flat.recommended,
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...reactPlugin.configs.flat["jsx-runtime"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...reactHooksPlugin.configs.flat.recommended,
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "react/prop-types": "off",
    },
  },
);
