"use client";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronsUpDown, KeyRound, LogOut, UserPen } from "lucide-react";
import { usePresentation } from "./presentation";
export function SidebarUser({
  name,
  email,
  onProfile,
  onLogout,
}: {
  name: string;
  email?: string;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const { locale } = usePresentation();
  const profile = locale === "en" ? "Profile" : "個人設定";
  const password = locale === "en" ? "Change password" : "變更密碼";
  const logout = locale === "en" ? "Sign out" : "登出";
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="sidebar-user"
          aria-label={locale === "en" ? "User menu" : "使用者選單"}
        >
          <span className="user-avatar">{name[0]?.toUpperCase() ?? "U"}</span>
          <span className="user-identity">
            <strong>{name}</strong>
            {email && <small>{email}</small>}
          </span>
          <ChevronsUpDown size={16} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="platform-menu user-menu"
          side="right"
          align="end"
          sideOffset={4}
        >
          <Dropdown.Label className="user-menu-label">
            <span className="user-avatar">{name[0]?.toUpperCase() ?? "U"}</span>
            <span className="user-identity">
              <strong>{name}</strong>
              {email && <small>{email}</small>}
            </span>
          </Dropdown.Label>
          <Dropdown.Separator className="platform-menu-separator" />
          <Dropdown.Item className="platform-menu-item" onSelect={onProfile}>
            <UserPen size={16} />
            {profile}
          </Dropdown.Item>
          <Dropdown.Item className="platform-menu-item" onSelect={onProfile}>
            <KeyRound size={16} />
            {password}
          </Dropdown.Item>
          <Dropdown.Separator className="platform-menu-separator" />
          <Dropdown.Item className="platform-menu-item" onSelect={onLogout}>
            <LogOut size={16} />
            {logout}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
