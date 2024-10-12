import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactLint from 'eslint-plugin-react';
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Linter } from "eslint";

/** @type {Linter.Config[]} */
export default [
  eslintConfigPrettier,
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactLint.configs.flat["jsx-runtime"],
  {
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      ...reactLint.configs.flat["jsx-runtime"].languageOptions,
      globals: globals.browser },
    plugins: {
      "react-refresh": reactRefresh,
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off'
    }
  }
];
