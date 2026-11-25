const themeStorageKey = "starlight-theme";

const themeChoices = new Set(["dark", "light", "auto"]);

const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const storedTheme = (): string => {
  const stored = window.localStorage.getItem(themeStorageKey);

  return stored !== null && themeChoices.has(stored) ? stored : "auto";
};

const applyTheme = (choice: string): void => {
  document.documentElement.dataset.theme =
    choice === "auto" ? systemTheme() : choice;
};

const rememberTheme = (choice: string): void => {
  window.localStorage.setItem(themeStorageKey, choice === "auto" ? "" : choice);
};

export const bindThemePicker = (): void => {
  const picker =
    document.querySelector<HTMLSelectElement>("#docs-theme-select");

  if (picker === null) {
    return;
  }

  const initial = storedTheme();

  picker.value = initial;
  applyTheme(initial);

  picker.addEventListener("change", () => {
    applyTheme(picker.value);
    rememberTheme(picker.value);
  });

  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", () => {
      if (storedTheme() === "auto") {
        applyTheme("auto");
      }
    });
};
