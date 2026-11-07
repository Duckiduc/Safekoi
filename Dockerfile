# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Placeholders satisfy env validation at build time; real values are read when the container starts.
RUN DATABASE_URL=postgres://build/build ORIGIN=http://localhost BETTER_AUTH_SECRET=build-only \
    npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 MIGRATIONS_DIR=/app/drizzle
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
# Migrations + built-in data are applied by the server's init hook on start.
CMD ["node", "build"]
