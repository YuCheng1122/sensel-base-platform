# @sensel/ui

Reusable platform UI, with responsive navigation, accessible native controls, account/group administration, model settings and personal settings. Uses React 18 and the versioned platform REST endpoints under `/api/core`; it does not import a customer app or Prisma client.

```tsx
import '@sensel/ui/styles.css';
import { Login, AppShell, ModelSettings } from '@sensel/ui';
```

`Login` returns the authenticated user through `onLogin`. `AppShell` takes the customer's `brand`, navigation items, active item and content. `AccessSettings` takes `kind="users"` or `kind="groups"`. `ProfileSettings` receives the current user, `onUpdate`, and `onPasswordChanged`. Password changes revoke sessions, so the latter callback must return the application to sign-in. Authorization is enforced by the server; hiding admin navigation is presentation only.

The stylesheet retains the source application's blue/gray design tokens, light/dark surfaces, focus treatment, compact spacing and responsive layout. Only consumed primitives are included. Domain badges, asset pages, report layouts and source-specific widgets are not included.

Validation: root `npm run lint`, `npm run typecheck`, and `npm run test:ui`. Public components are client components except static primitives; use Next.js `transpilePackages: ['@sensel/ui', '@sensel/chat']` with source exports.
