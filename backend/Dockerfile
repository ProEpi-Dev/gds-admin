# syntax=docker/dockerfile:1
#
# Build: Debian glibc (compatível com Prisma e bcrypt nativos).
# Runtime: bookworm-slim ainda inclui npm/Yarn; após install, removemos gerenciadores (só `node` no CMD).
# Alternativa sem shell na imagem final: Dockerfile.distroless.

ARG NODE_VERSION=20

# -------- Build --------
FROM node:${NODE_VERSION}-bookworm AS builder

WORKDIR /app

# full-upgrade: aplica security updates do snapshot Debian (bookworm / bookworm-security).
RUN apt-get update \
    && apt-get full-upgrade -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json yarn.lock ./

# Cache só nesta camada (some antes do fim do RUN)
RUN YARN_CACHE_FOLDER=/tmp/yarn-cache yarn install --frozen-lockfile \
    && rm -rf /tmp/yarn-cache

COPY prisma ./prisma/
COPY prisma.config.ts ./

ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate

COPY . .

RUN yarn build
RUN test -f dist/src/main.js || (ls -la dist src 2>/dev/null; exit 1)

# -------- Runtime (slim) --------
FROM node:${NODE_VERSION}-bookworm-slim AS production

WORKDIR /app

# Mesmo padrão do builder: pacotes corrigíveis via apt (CVEs sem DSA em Bookworm
# continuam documentados em .trivyignore — ver security-tracker.debian.org).
RUN apt-get update \
    && apt-get full-upgrade -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json yarn.lock ./

RUN YARN_CACHE_FOLDER=/tmp/yarn-cache yarn install --frozen-lockfile --production \
    && rm -rf /tmp/yarn-cache /root/.cache/yarn /root/.yarn

COPY prisma ./prisma/
COPY prisma.config.ts ./

ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate \
    && rm -rf node_modules/prisma node_modules/.bin/prisma \
    && rm -rf node_modules/typescript node_modules/.bin/tsc node_modules/.bin/tsserver

COPY --from=builder /app/dist ./dist

RUN test -f dist/src/main.js || exit 1

# Evita que o Trivy (node-pkg) varra a árvore do npm embutido na imagem oficial (cross-spawn, glob, tar…).
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
    && rm -rf /opt/yarn-v* \
    && rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && rm -rf /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/corepack || true \
    && rm -rf /usr/local/share/.cache/yarn /root/.cache/yarn /root/.yarn /root/.cache/node 2>/dev/null || true

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
