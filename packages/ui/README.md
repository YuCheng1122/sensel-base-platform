# @sensel/ui

Reusable authentication, navigation and settings UI adapted from the original application. The authentication screen keeps the original 45%/55% composition, Avocado SenseL logo assets, 380px form, rounded controls, branding panel and footer. The application shell keeps the original floating sidebar, nested settings navigation, 56px header and footer user menu.

```tsx
import '@sensel/ui/styles.css';
import { PlatformThemeProvider, Login, AppShell } from '@sensel/ui';

<PlatformThemeProvider>
  <Login onLogin={setUser} />
</PlatformThemeProvider>
```

The consuming application loads Geist Sans/Mono variables and serves the default logo/favicon files, as the project template does. Shared `--font-sans` and `--font-mono` tokens include complete system fallbacks when those variables are absent. Code, preformatted text, keyboard hints and monospace labels use the same mono token. `Login` accepts `logoSrc`, `brandLogoSrc`, `branding`, an optional `title`, and `registrationHref`. Without a registration route it explains that an administrator creates accounts. The base authenticates by email; it does not claim the source application's username or self-registration functionality.

`AppShell` takes `name`, optional `email`, `brand`, `logoSrc` and `iconSrc`, navigation items, the active item, navigation/logout callbacks, and page content. Core settings appear as nested navigation; profile/password and logout appear in the user dropdown. Customers supply their own feature navigation and branding. Desktop navigation collapses to icons; mobile navigation uses a keyboard-accessible Radix dialog.

`PlatformThemeProvider` provides the original system-default light/dark theme with persistent preference. Its language menu translates authentication and shell controls between Traditional Chinese and English; settings and chat content remain Traditional Chinese in this version. This is not a complete application localization layer.

`AccessSettings` implements account/group management with a full-width list and dialog editor. `ModelSettings` provides configuration, separate connection/tool checks and saved model detail panels. `ProfileSettings` receives the current user, `onUpdate`, and `onPasswordChanged`; password changes revoke sessions, so the latter callback returns the application to sign-in. All use the platform `/api/core` contract. Server authorization remains authoritative.

Styles have one ownership location: `tokens.css`, `primitives.css`, `page-layout.css`, `login.css`, `shell.css`, `sidebar-user.css`, `settings.css` and `mail.css`, imported by `styles.css`. Chat-specific presentation lives in `@sensel/chat/styles.css`. No customer app aliases, Prisma client, source-tree imports or domain widgets are included. Runtime dependencies are React, Radix menus/dialogs, Lucide icons and next-themes. Native logo images keep the package independent of Next.js.

Validation: root `npm run lint`, `npm run typecheck`, and `npm run test:ui`. Next.js consumers transpile `@sensel/ui` and `@sensel/chat`. Source provenance and deliberate adaptations are recorded in `extraction-manifest.json`.

`PlatformSettings` provides versioned platform name, IANA display timezone and report defaults. Its `onSaved` callback lets the customer composition refresh presentation defaults. The related audit view displays the most recent 50 platform-setting changes; it does not claim to be the complete user/model audit UI. Settings form layout is shared with model editing instead of duplicating CSS.

## Shared page layout

Overview, reports and every settings page use `.sensel-page`, owned by `page-layout.css`: a centered 1280px maximum width including padding, 24px padding on desktop and 16px below 640px, and 24px between page sections. Page headings use 24px/32px on desktop and 20px/28px on mobile; section headings use 16px/24px. This shared middle width replaces the previous independent overview/report/profile limits. The shell adds no second padding layer. Chat retains its full-height viewport and does not use this class. Customer pages can reuse the class or override the documented CSS variables deliberately.

## Mail settings

`MailServiceSettings({actorId})` provides versioned provider/from/enabled settings, masked API-key status, blank-key preservation, an explicit fixed-content test, and paginated delivery history. Provider choices come from backend capabilities; the UI does not offer SMTP or assume fake transport is available. It never reveals or copies the stored plaintext key.

The current operation key and outcome persist in session storage under the authenticated actor ID and settings version. A submitted operation locks its recipient and send button. Refreshing history only reads existing receipts. An explicit new-test action requires acknowledgement before unlocking another operation; changing the saved configuration version starts a separate draft while earlier receipts remain in server history. No automatic retry is performed after an ambiguous response.

An accepted provider response is not a delivery confirmation. Unknown outcomes remain visibly uncertain and advise checking the mailbox/provider before any new send. Synthetic results are labeled as such. The current UI does not claim webhook delivery tracking or a provider-status lookup feature. Browser mail tests use mocked synthetic responses only; server transport tests remain separate.
