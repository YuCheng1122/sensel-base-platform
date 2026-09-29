"use client";
import { useEffect, useState } from "react";
import {
  AccessSettings,
  ApiError,
  Button,
  AppShell,
  Login,
  ModelSettings,
  MailServiceSettings,
  Notice,
  ProfileSettings,
  PlatformSettings,
  type PlatformSettingsData,
  request,
  type User,
} from "@sensel/ui";
import { ChatWorkspace } from "@sensel/chat";
import { AnalysisPages } from "./analysis-pages";
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("chat");
  const [error, setError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [settingsRetry, setSettingsRetry] = useState(0);
  useEffect(() => {
    if (!user) {
      setSettings(null);
      return;
    }
    const controller = new AbortController();
    setSettingsError("");
    request<{ item: PlatformSettingsData }>("/settings", {
      signal: controller.signal,
    })
      .then((result) => setSettings(result.item))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setSettingsError(
            cause instanceof Error ? cause.message : "無法載入平台設定。",
          );
      });
    return () => controller.abort();
  }, [user, settingsRetry]);
  useEffect(() => {
    request<{ user: User }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch((cause) => {
        setUser(null);
        if (!(cause instanceof ApiError && cause.status === 401))
          setError("無法載入工作空間，請稍後重試。");
      })
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      setActive("chat");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Logout failed");
    }
  }
  if (loading)
    return (
      <main className="login-page">
        <p role="status">載入工作空間…</p>
      </main>
    );
  if (!user && error)
    return (
      <main className="login-page">
        <section className="panel stack">
          <Notice error>{error}</Notice>
          <Button onClick={() => window.location.reload()}>重新載入</Button>
        </section>
      </main>
    );
  if (!user)
    return (
      <Login
        notice={loginNotice}
        onLogin={(nextUser) => {
          setUser(nextUser);
          setLoginNotice("");
        }}
      />
    );
  const navigation = [
    { id: "overview", label: "事件概覽" },
    { id: "chat", label: "對話分析" },
    { id: "reports", label: "報告下載" },
    ...(user.role === "ADMIN"
      ? [
          { id: "platform", label: "平台設定" },
          { id: "mail", label: "信件服務" },
          { id: "models", label: "模型設定" },
          { id: "users", label: "使用者管理" },
          { id: "groups", label: "群組管理" },
        ]
      : []),
    { id: "profile", label: "個人設定" },
  ];
  return (
    <AppShell
      brand={settings?.name ?? "SenseL"}
      name={user.name}
      email={user.email}
      navigation={navigation}
      active={active}
      onNavigate={setActive}
      onLogout={() => void logout()}
    >
      {error && <Notice error>{error}</Notice>}
      {active === "chat" && <ChatWorkspace />}
      {(active === "overview" || active === "reports") && settingsError && (
        <div className="stack">
          <Notice error>{settingsError}</Notice>
          <Button onClick={() => setSettingsRetry((value) => value + 1)}>
            重試載入平台設定
          </Button>
        </div>
      )}
      {active === "reports" && (
        <AnalysisPages
          active="reports"
          settings={settingsError ? null : settings}
        />
      )}
      {active === "overview" &&
        !settingsError &&
        (settings ? (
          <AnalysisPages active="overview" settings={settings} />
        ) : (
          <p role="status">載入平台設定…</p>
        ))}
      {user.role === "ADMIN" && active === "platform" && (
        <PlatformSettings
          onSaved={(value) => {
            setSettings(value);
            setSettingsError("");
          }}
        />
      )}
      {user.role === "ADMIN" && active === "mail" && <MailServiceSettings actorId={user.id} />}
      {user.role === "ADMIN" && active === "models" && <ModelSettings />}
      {user.role === "ADMIN" && (active === "users" || active === "groups") && (
        <AccessSettings key={active} kind={active} />
      )}
      {active === "profile" && (
        <ProfileSettings
          user={user}
          onUpdate={setUser}
          onPasswordChanged={() => {
            setUser(null);
            setActive("chat");
            setLoginNotice("密碼已更新，請使用新密碼重新登入。");
          }}
        />
      )}
    </AppShell>
  );
}
