# Documentation Images

[Documentation](../README.md) · [Project home](../../README.md)

These PNGs are actual platform browser captures or rasterized PDF output, not concept art. The current set was captured on 2026-09-30 from a local production build with isolated synthetic PostgreSQL and explicitly enabled fake providers.

| Image | Content | Capture |
| --- | --- | --- |
| [login.png](login.png) | Login and branding | 1440 × 1000 viewport |
| [overview.png](overview.png) | Coverage, metrics, trends and distributions | 1440 × 1000 viewport |
| [reports.png](reports.png) | Editable report sections | 1440 × 1000 viewport |
| [report-pdf.png](report-pdf.png) | Edited Chinese prose, metrics and graphic trend | Page 2 of actual exported PDF, rasterized with pdftoppm |
| [entity.png](entity.png) | Synthetic host attributes and related entities | 1440 × 1000 viewport; related events continue below |
| [event.png](event.png) | Original synthetic event JSON and completeness state | 1440 × 1000 viewport |
| [rankings.png](rankings.png), [rankings-dark.png](rankings-dark.png) | Shared searchable, sortable table | Component captures, light/dark |
| [chat.png](chat.png) | Suggestions with tool panel initially closed | 1440 × 1000 viewport; synthetic test history |
| [model-usage.png](model-usage.png) | Key-shared quota, used/remaining/limit | Component capture with mocked usage response |
| [event-distributions.png](event-distributions.png) | Aggregate categories and returned-event levels | Retained 2026-09-29 synthetic component capture |
| [mail.png](mail.png) | Mail settings and simulated delivery records | Retained 2026-09-29 browser capture, 1440px wide/full page |

Accounts use example.test. Quota amounts, events, model records and chat history are synthetic; no real provider or mail delivery was invoked. The quota capture demonstrates rendering, not a live TokenFleet balance check. Older retained images reflect their recorded version.

Reproduce the current browser captures with tests/ui/z-docs-capture.spec.ts on the isolated stack described in [testing](../testing.md). The PDF capture comes from tests/ui/evolution.spec.ts. Review credentials, customer data and personal information before copying artifacts into this directory, and update this provenance record.
