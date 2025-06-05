// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
    files: ["**/*.ts"],
    extends: [
        eslint.configs.recommended,
        tseslint.configs.recommended,
    ],
    rules: {
        indent: ["error", 4],
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        semi: ["warn", "always"],
        quotes: ["warn", "double"],
        "sort-imports": ["error", {
            ignoreCase: true,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
        }],
    },
});
