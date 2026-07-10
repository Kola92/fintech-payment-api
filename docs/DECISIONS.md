
## fast-uri CVE (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc)
**Date:** $(date +%Y-%m-%d)
**Decision:** Defer upgrade to Fastify v5 until after core API is built.
**Reason:** Fix requires `npm audit fix --force` which installs Fastify v5 — a breaking change. @fastify/swagger and @fastify/swagger-ui compatibility with v5 needs to be verified first. These CVEs affect path traversal via percent-encoded segments, which is low risk in a local dev/portfolio context with no public traffic. Revisit before production deployment.
