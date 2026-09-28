"use client";
/* Framework-neutral package: native logo images avoid a Next.js runtime dependency. */
/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent } from "react";
import { Activity, Lock, Shield } from "lucide-react";
import { request, type User } from "./api-client";
import { Button, Field, Notice } from "./primitives";
import { LanguageMenu, usePresentation } from "./presentation";

export interface LoginBranding {
  tagline: string;
  description: string;
  features: [string, string, string];
}
const copy = {
  "zh-Hant": {
    title: "登入您的帳號",
    email: "電子郵件",
    password: "密碼",
    signIn: "登入",
    signingIn: "登入中...",
    noAccount: "還沒有帳號？",
    register: "註冊",
    contact: "請聯繫管理員建立帳號。",
    learnMore: "了解更多",
    tagline: "SenseL 智慧分析平台",
    description: "透過資料探索、持續分析和智慧助理，掌握重要資訊並支援決策。",
    features: ["整合資料與分析工具", "持續探索與洞察", "智慧助理協作流程"] as [
      string,
      string,
      string,
    ],
  },
  en: {
    title: "Sign in to your account",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",
    register: "Sign up",
    contact: "Contact your administrator to create an account.",
    learnMore: "Learn more",
    tagline: "SenseL Intelligent Analytics",
    description:
      "Explore data, analyze continuously, and work with intelligent assistants to make informed decisions.",
    features: [
      "Connected data and analysis tools",
      "Continuous exploration and insights",
      "Intelligent assistant workflows",
    ] as [string, string, string],
  },
};
export function Login({
  onLogin,
  title,
  notice,
  branding,
  registrationHref,
  logoSrc = "/Avocado_SenseL_logo_transparent.png",
  brandLogoSrc = "/Avocado_SenseL_vertical_consistent_transparent.png",
}: {
  onLogin: (user: User) => void;
  title?: string;
  notice?: string;
  branding?: LoginBranding;
  registrationHref?: string;
  logoSrc?: string;
  brandLogoSrc?: string;
}) {
  const { locale } = usePresentation();
  const t = copy[locale];
  const brand = branding ?? t;
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
  const icons = [Shield, Activity, Lock];
  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <div className="auth-logo">
          <img src={logoSrc} alt="Avocado SenseL" width={140} height={42} />
        </div>
        <div className="auth-form-center">
          <div className="auth-form-content">
            <h1>{title ?? t.title}</h1>
            {error && <Notice error>{error}</Notice>}
            {notice && <Notice>{notice}</Notice>}
            <form className="auth-form" onSubmit={submit}>
              <div className="auth-fields">
                <Field label={t.email}>
                  <div className="auth-input-glow">
                    <input
                      name="email"
                      type="email"
                      placeholder={t.email}
                      autoComplete="username"
                      required
                    />
                  </div>
                </Field>
                <Field label={t.password}>
                  <div className="auth-input-glow">
                    <input
                      name="password"
                      type="password"
                      placeholder={t.password}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </Field>
              </div>
              <div className="auth-submit">
                <Button disabled={busy}>{busy ? t.signingIn : t.signIn}</Button>
              </div>
            </form>
            <p className="auth-registration">
              {registrationHref ? (
                <>
                  {t.noAccount} <a href={registrationHref}>{t.register}</a>
                </>
              ) : (
                t.contact
              )}
            </p>
          </div>
        </div>
        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Avocado SenseL Inc.</span>
          <div>
            <a
              href="https://www.avocadolab.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.learnMore}
            </a>
            <LanguageMenu compact />
          </div>
        </footer>
      </section>
      <section
        className="auth-brand-panel"
        aria-label={locale === "en" ? "Platform introduction" : "平台介紹"}
      >
        <div className="auth-decoration" aria-hidden="true">
          <div className="auth-grid-pattern" />
          <i className="auth-circle outer" />
          <i className="auth-circle inner" />
          <i className="auth-circle bottom" />
          <i className="auth-line" />
          <i className="auth-dot one" />
          <i className="auth-dot two" />
          <i className="auth-dot three" />
          <i className="auth-glow" />
        </div>
        <div className="auth-brand-content">
          <img
            src={brandLogoSrc}
            alt="Avocado SenseL"
            width={160}
            height={160}
          />
          <h2>{brand.tagline}</h2>
          <p>{brand.description}</p>
          <div className="auth-features">
            {brand.features.map((feature, index) => {
              const Icon = icons[index]!;
              return (
                <div key={feature}>
                  <span>
                    <Icon size={16} />
                  </span>
                  <span>{feature}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
