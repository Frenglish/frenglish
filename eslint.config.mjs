import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import prettierConfig from "eslint-config-prettier"
import enforceNoLocalhost from "./.eslint/rules/enforce-no-localhost.js"

export default [
  // Recommended ESLint rules for JS and TypeScript.
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      // Define Node.js globals and others.
      globals: {
        process: true,
        console: true,
        module: true,
        require: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        Promise: true,
        Map: true,
        Set: true,
        WeakMap: true,
        WeakSet: true,
        Proxy: true,
        Reflect: true,
        JSON: true,
        Math: true,
        Date: true,
        RegExp: true,
        Error: true,
        EvalError: true,
        RangeError: true,
        ReferenceError: true,
        SyntaxError: true,
        TypeError: true,
        URIError: true,
        Array: true,
        ArrayBuffer: true,
        Boolean: true,
        DataView: true,
        Float32Array: true,
        Float64Array: true,
        Int8Array: true,
        Int16Array: true,
        Int32Array: true,
        Uint8Array: true,
        Uint8ClampedArray: true,
        Uint16Array: true,
        Uint32Array: true,
        Object: true,
        Function: true,
        String: true,
        Number: true,
        Symbol: true
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      custom: {
        rules: {
          "enforce-no-localhost": enforceNoLocalhost
        }
      }
    },
    rules: {
      ...prettierConfig.rules,
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      semi: ["error", "never"],
      indent: ["error", 2],
      "custom/enforce-no-localhost": "error"
    }
  }
]
