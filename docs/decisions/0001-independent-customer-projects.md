# ADR 0001: Independent Customer Projects and Shared Core

Status: accepted.

The platform must support different customers and domains, including SOC, Nginx and future PCAP analysis. Use versioned shared packages plus a one-time initialization template; every customer owns an independent repository, database and deployment.

Do not place all customer logic in the platform behind customer-specific switches: different data domains would couple the core. A copy-only template is also insufficient because fixes could not remain shared over time.

Prisma/PostgreSQL is the initial default; Elasticsearch is optional. Agent uses tool contracts and holds no database credentials. The tradeoff is that customers maintain thin adapters and migrations, while the platform must publish clear contracts and upgrade instructions.
