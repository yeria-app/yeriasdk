# Multi-stage build for yeria-demo. Build context is the yeria-sdk workspace
# root (so the Dockerfile can see both js/ and demo/). Run from outside via
# either compose (build.context: ./yeria-sdk) or scripts/build-demo-image.sh.

# ── Stage 1: install workspace deps ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY js/package.json   ./js/
COPY demo/package.json ./demo/
RUN npm ci

# ── Stage 2: build SDK then demo ───────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
COPY js   ./js
COPY demo ./demo
RUN npm -w js run build && npm -w demo run build

# ── Stage 3: minimal runtime ───────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
# The workspace root keeps node_modules deduped; we copy the whole tree (it's
# already prod-trimmed by Stage 1's `npm ci` against package-lock.json) plus
# the built dist/ directories.
COPY --from=build /app/node_modules ./node_modules
# Stage 1's `npm ci` left node_modules/@numerum-tech/yeriasdk as a workspace
# symlink into js/ (dangling here since js/ isn't in this stage). Replace it
# with a real package dir holding the built SDK.
RUN rm -rf ./node_modules/@numerum-tech/yeriasdk
COPY --from=build /app/js/dist           ./node_modules/@numerum-tech/yeriasdk/dist
COPY --from=build /app/js/package.json   ./node_modules/@numerum-tech/yeriasdk/package.json
COPY --from=build /app/demo/dist         ./dist
COPY --from=build /app/demo/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=8051
EXPOSE 8051
CMD ["node", "dist/server.js"]
