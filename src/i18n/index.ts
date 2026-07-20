import { initToolI18n } from "@snapbox/pkg-ui";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

const i18n = initToolI18n(resources);

export default i18n;