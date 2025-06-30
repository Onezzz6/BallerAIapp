module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "node_modules/**/*",
  ],
  rules: {
    "quotes": ["error", "single"],
    "indent": ["error", 2],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off", // Allow console.log in Cloud Functions
    "max-len": ["error", { "code": 120 }],
  },
}; 