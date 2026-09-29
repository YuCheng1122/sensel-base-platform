"use client";
import { useState, type FormEvent } from "react";
import { request, type User } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
export function ProfileSettings({
  user,
  onUpdate,
  onPasswordChanged,
}: {
  user: User;
  onUpdate: (user: User) => void;
  onPasswordChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ user: User }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          ...(form.get("newPassword")
            ? {
                currentPassword: form.get("currentPassword"),
                newPassword: form.get("newPassword"),
              }
            : {}),
        }),
      });
      if (form.get("newPassword")) {
        onPasswordChanged();
        return;
      }
      onUpdate(result.user);
      element.reset();
      setNotice("個人資料已更新。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sensel-page">
      <PageHeader title="個人設定" />
      <form className="panel stack" onSubmit={save}>
        <p className="muted">
          {user.email} · {user.role}
        </p>
        <Field label="名稱">
          <input name="name" defaultValue={user.name} required />
        </Field>
        <Field label="目前密碼">
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </Field>
        <Field label="新密碼（不變更請留空）">
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
          />
        </Field>
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <Button disabled={busy}>儲存</Button>
      </form>
    </div>
  );
}
