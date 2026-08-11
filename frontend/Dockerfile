# Build stage
FROM cgr.dev/chainguard/node@sha256:2fae77aa4b94e032e825e3d72653c932c8e89505a7547f5b67cd8ef0a24831dd AS builder
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . .
RUN npm run build

# ── Production stage ──
# Serve the static bundle with Chainguard's minimal nginx instead of pulling
# in a full Node runtime just to run `serve` — smaller image, fewer CVEs,
# and nginx already runs as non-root on port 8080 out of the box.
FROM cgr.dev/chainguard/nginx@sha256:2189489ef3fa5b1e94a8463f98f9c148a4d8e7498d3f747069fc78de405742fc
# Static content stays root-owned and read-only — nginx only needs to read
# these files to serve them, so it should never own or be able to modify them.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend.nginx.conf /etc/nginx/conf.d/default.conf
USER nginx

EXPOSE 8080
CMD ["-g", "daemon off;"]