const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = {
  plugins: {
    eslintConfigPrettier
  },
  files: ["src/**/*.js"],
  languageOptions: {
    ecmaVersion: "latest"
  },
  rules: {
    "max-len": ["error", { code: 80, tabWidth: 2 }],
    "no-unused-vars": "error",
    "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
    "no-console": "off",
    "no-plusplus": "off"
  }
};
