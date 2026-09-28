# @sensel/ui

Reusable authentication, navigation and settings UI adapted from the original application. The authentication screen keeps the original 45%/55% composition, Avocado SenseL logo assets, 380px form, rounded controls, branding panel and footer. The application shell keeps the original floating sidebar, nested settings navigation, 56px header and footer user menu.

```tsx
import '@sensel/ui/styles.css';
import { PlatformThemeProvider, Login, AppShell } from '@sensel/ui';

<PlatformThemeProvider>
  <Login onLogin={setUser} />
</PlatformThemeProvider>
```

The consuming application loads Geist Sans/Mono variables and serves the default logo/favicon files, as the project template does. `Login` accepts `logoSrc`, `brandLogoSrc`, `branding`, an optional `title`, and `registrationHref`. Without a registration route it explains that an administrator creates accounts. The base authenticates by email; it does not claim the source application's username or self-registration functionality.

`AppShell` takes `name`, optional `email`, `brand`, `logoSrc` and `iconSrc`, navigation items, the active item, navigation/logout callbacks, and page content. Core settings appear as nested navigation; profile/password and logout appear in the user dropdown. Customers supply their own feature navigation and branding. Desktop navigation collapses to icons; mobile navigation uses a keyboard-accessible Radix dialog.

`PlatformThemeProvider` provides the original system-default light/dark theme with persistent preference. Its language menu translates authentication and shell controls between Traditional Chinese and English; settings and chat content remain Traditional Chinese in this version. This is not a complete application localization layer.

`AccessSettings` implements account/group management with a full-width list and dialog editor. `ModelSettings` provides configuration, separate connection/tool checks and saved model detail panels. `ProfileSettings` receives the current user, `onUpdate`, and `onPasswordChanged`; password changes revoke sessions, so the latter callback returns the application to sign-in. All use the platform `/api/core` contract. Server authorization remains authoritative.

Styles have one ownership location: `tokens.css`, `primitives.css`, `login.css`, `shell.css`, `sidebar-user.css` and `settings.css`, imported by `styles.css`. Chat-specific presentation lives in `@sensel/chat/styles.css`. No customer app aliases, Prisma client, source-tree imports or domain widgets are included. Runtime dependencies are React, Radix menus/dialogs, Lucide icons and next-themes. Native logo images keep the package independent of Next.js.

Validation: root `npm run lint`, `npm run typecheck`, and `npm run test:ui`. Next.js consumers transpile `@sensel/ui` and `@sensel/chat`. Source provenance and deliberate adaptations are recorded in `extraction-manifest.json`.

`PlatformSettings` provides versioned platform name, IANA display timezone and report defaults. Its `onSaved` callback lets the customer composition refresh presentation defaults. The related audit view displays the most recent 50 platform-setting changes; it does not claim to be the complete user/model audit UI. Settings form layout is shared with model editing instead of duplicating CSS.
