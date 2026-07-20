export default {
  locales: [
    "en",
    "zh"
  ],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/i18n/locales/{{language}}.json"
  }
}