"use client";
/* Framework-neutral package: native logo images avoid a Next.js runtime dependency. */
/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronRight,
  PanelLeft,
  Settings,
  X,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { LanguageMenu, ThemeToggle, usePresentation } from "./presentation";
import { SidebarUser } from "./sidebar-user";
export interface NavigationItem {
  id: string;
  label: string;
}
export function AppShell({
  name,
  email,
  brand = "SenseL",
  logoSrc = "/Avocado_SenseL_logo_transparent.png",
  iconSrc = "/favicon.ico",
  navigation,
  active,
  onNavigate,
  onLogout,
  children,
}: {
  name: string;
  email?: string;
  brand?: string;
  logoSrc?: string;
  iconSrc?: string;
  navigation: NavigationItem[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const { locale } = usePresentation();
  const labels: Record<string, string> =
    locale === "en"
      ? {
          chat: "Analysis chat",
          models: "Models",
          overview: "Event overview",
          reports: "Report downloads",
          platform: "Platform settings",
          mail: "Mail service",
          users: "Users",
          groups: "Groups",
          profile: "Profile",
        }
      : {};
  const label = (item: NavigationItem) => labels[item.id] ?? item.label;
  const settings = navigation.filter((item) =>
    ["platform", "mail", "models", "users", "groups"].includes(item.id),
  );
  const general = navigation.filter(
    (item) =>
      !["platform", "mail", "models", "users", "groups", "profile"].includes(item.id),
  );
  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };
  const settingsLabel = locale === "en" ? "System settings" : "系統設定";
  const sidebar = (mobile = false) => (
    <>
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => navigate(general[0]?.id ?? "chat")}
          aria-label={`${brand} 首頁`}
        >
          <img
            className="sidebar-logo"
            src={logoSrc}
            alt={`${brand} Logo`}
            width={1184}
            height={312}
          />
          <img
            className="sidebar-symbol"
            src={iconSrc}
            width={28}
            height={28}
            alt=""
          />
        </button>
      </div>
      <nav
        className="sidebar-navigation"
        aria-label={locale === "en" ? "Main navigation" : "主選單"}
      >
        <div className="sidebar-group">
          <div className="sidebar-group-label">
            {locale === "en" ? "Overview" : "總覽"}
          </div>
          {general.map((item) => {
            const Icon = item.id === "chat" ? Zap : LayoutDashboard;
            return (
              <button
                type="button"
                key={item.id}
                className="sidebar-link"
                aria-current={active === item.id ? "page" : undefined}
                title={label(item)}
                onClick={() => navigate(item.id)}
              >
                <Icon size={16} />
                <span>{label(item)}</span>
              </button>
            );
          })}
        </div>
        {settings.length > 0 && (
          <div className="sidebar-group">
            <div className="sidebar-group-label">
              {locale === "en" ? "Settings" : "設定"}
            </div>
            <button
              type="button"
              className="sidebar-link settings-toggle"
              data-active={settings.some((item) => item.id === active)}
              aria-expanded={settingsOpen}
              onClick={() => {
                if (collapsed && !mobile) setCollapsed(false);
                else setSettingsOpen(!settingsOpen);
              }}
              title={settingsLabel}
            >
              <Settings size={16} />
              <span>{settingsLabel}</span>
              <ChevronRight
                size={16}
                className={settingsOpen ? "expanded" : ""}
              />
            </button>
            {settingsOpen && (
              <div className="sidebar-submenu">
                {settings.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={active === item.id ? "page" : undefined}
                    onClick={() => navigate(item.id)}
                  >
                    {label(item)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-preferences">
          <LanguageMenu />
          <ThemeToggle />
        </div>
        <SidebarUser
          name={name}
          email={email}
          onProfile={() => navigate("profile")}
          onLogout={onLogout}
        />
      </div>
    </>
  );
  const current = navigation.find((item) => item.id === active);
  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="desktop-sidebar">
        <div className="sidebar-surface">{sidebar()}</div>
      </aside>
      <div className="workspace">
        <header className="shell-topbar">
          <button
            type="button"
            className="icon-button desktop-sidebar-toggle"
            aria-label={locale === "en" ? "Toggle sidebar" : "切換側邊欄"}
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeft size={16} />
          </button>
          <button
            type="button"
            className="icon-button mobile-sidebar-toggle"
            aria-label={locale === "en" ? "Toggle sidebar" : "切換側邊欄"}
            onClick={() => setMobileOpen(true)}
          >
            <PanelLeft size={16} />
          </button>
          <span className="shell-divider" />
          <span className="shell-breadcrumb">
            {current
              ? label(current)
              : locale === "en"
                ? "Profile"
                : "個人設定"}
          </span>
        </header>
        <main className="main-content">{children}</main>
      </div>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="sidebar-overlay" />
          <Dialog.Content className="mobile-sidebar">
            <Dialog.Title className="sr-only">
              {locale === "en" ? "Navigation menu" : "導覽選單"}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {locale === "en"
                ? "Choose a workspace or settings page"
                : "選擇工作區或設定頁面"}
            </Dialog.Description>
            {sidebar(true)}
            <Dialog.Close
              className="sidebar-close icon-button"
              aria-label={locale === "en" ? "Close navigation" : "關閉選單"}
            >
              <X size={16} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
