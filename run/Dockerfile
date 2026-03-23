FROM node:20-bookworm-slim AS base

WORKDIR /workspace/quasar

COPY quasar/package*.json ./
RUN npm install

COPY quasar/ ./

FROM base AS dev-base

CMD ["sh", "-lc", "./node_modules/.bin/quasar dev --host 0.0.0.0 --port ${FRONTEND_PORT:-21002}"]

FROM base AS prod-builder

RUN ./node_modules/.bin/quasar build

FROM node:20-bookworm-slim AS prod-runtime

WORKDIR /app

RUN npm install -g @quasar/cli

COPY --from=prod-builder /workspace/quasar/dist/spa /app/dist/spa
COPY --from=prod-builder /workspace/quasar/proxy.mjs /app/proxy.mjs

EXPOSE 21002

CMD ["sh", "-lc", "quasar serve /app/dist/spa --history --host 0.0.0.0 --port ${FRONTEND_PORT:-21002} --proxy /app/proxy.mjs"]
