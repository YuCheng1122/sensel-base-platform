"use client";
import { useState, type ReactNode } from "react";
import { Button } from "./primitives";
export interface NavigationItem {
  id: string;
  label: string;
}
export function AppShell({
  name,
  brand = "SenseL",
  navigation,
  active,
  onNavigate,
  onLogout,
  children,
}: {
  name: string;
  brand?: string;
  navigation: NavigationItem[];
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [dark, setDark] = useState(false);
  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>
      <header className="topbar">
        <strong>{brand}</strong>
        <div className="row">
          <span>{name}</span>
          <Button
            variant="secondary"
            onClick={() => setDark(!dark)}
            aria-label="切換深淺色"
          >
            {dark ? "淺色" : "深色"}
          </Button>
          <Button variant="secondary" onClick={onLogout}>
            登出
          </Button>
        </div>
      </header>
      <div className="workspace">
        <nav aria-label="主選單">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={item.id === active ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
