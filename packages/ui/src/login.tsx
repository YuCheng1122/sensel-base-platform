"use client";
import { useState, type FormEvent } from "react";
import { request, type User } from "./api-client";
import { Button, Field, Notice } from "./primitives";
export function Login({
  onLogin,
  title = "SenseL",
  notice,
}: {
  onLogin: (user: User) => void;
  title?: string;
  notice?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await request<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      onLogin(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <form className="panel login-form" onSubmit={submit}>
        <h1>{title}</h1>
        <p className="muted">登入您的分析工作空間</p>
        <Field label="電子郵件">
          <input name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="密碼">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {notice && <Notice>{notice}</Notice>}
        {error && <Notice error>{error}</Notice>}
        <Button disabled={busy}>{busy ? "登入中…" : "登入"}</Button>
      </form>
    </main>
  );
}
