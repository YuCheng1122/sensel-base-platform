"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider, useTheme } from "next-themes";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Globe, Moon, Sun } from "lucide-react";

type Locale = "zh-Hant" | "en";
const PresentationContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: "zh-Hant", setLocale: () => undefined });
export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh-Hant");
  useEffect(() => {
    const saved = localStorage.getItem("sensel-ui-locale");
    if (saved === "en" || saved === "zh-Hant") {
      setLocale(saved);
      document.documentElement.lang = saved;
    }
  }, []);
  const changeLocale = (next: Locale) => {
    setLocale(next);
    localStorage.setItem("sensel-ui-locale", next);
    document.documentElement.lang = next;
  };
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PresentationContext.Provider value={{ locale, setLocale: changeLocale }}>
        {children}
      </PresentationContext.Provider>
    </ThemeProvider>
  );
}
export function usePresentation() {
  return useContext(PresentationContext);
}
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { locale } = usePresentation();
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const label =
    locale === "en"
      ? dark
        ? "Light mode"
        : "Dark mode"
      : dark
        ? "切換淺色模式"
        : "切換深色模式";
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = usePresentation();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className={compact ? "auth-language" : "language-switcher"}
          aria-label="語言 / Language"
        >
          {!compact && <Globe size={16} />}
          <span>{locale === "en" ? "English" : "繁體中文"}</span>
          {compact && <ChevronDown size={12} />}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="platform-menu" align="end" sideOffset={4}>
          <Dropdown.Item
            className="platform-menu-item"
            disabled={locale === "zh-Hant"}
            onSelect={() => setLocale("zh-Hant")}
          >
            繁體中文
          </Dropdown.Item>
          <Dropdown.Item
            className="platform-menu-item"
            disabled={locale === "en"}
            onSelect={() => setLocale("en")}
          >
            English
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
