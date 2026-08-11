# Chainguard's Node images are Wolfi-based (distroless) — no shell, no package
# manager, low-to-zero known CVEs, non-root by default. The :20-dev
# variant has npm for installing deps; the final :20 runtime image does not.

FROM cgr.dev/chainguard/node@sha256:2fae77aa4b94e032e825e3d72653c932c8e89505a7547f5b67cd8ef0a24831dd AS builder
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .

FROM cgr.dev/chainguard/node@sha256:8e1189525a80564e0df5cec59bc4aa5d859869e6e7c05b0a4290682fbd53563e
WORKDIR /app

# Chainguard's node image already ships a non-root `node` user, but we
# declare it explicitly so static analysis (and future readers) can verify it.
# The running app code stays root-owned and read-only — the node process
# only needs to execute/read these files, so it should never be able to
# modify its own source or dependencies if compromised (S6504).
COPY --from=builder /app .
USER node

EXPOSE 5000
CMD ["server.js"]