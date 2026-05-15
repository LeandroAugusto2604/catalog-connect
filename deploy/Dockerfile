# Imagem para rodar o app Cloudflare Worker (gerado pelo TanStack Start)
# em qualquer VPS, usando o runtime workerd via `wrangler dev`.
#
# Build: docker build -f deploy/Dockerfile -t catalogo-app .
# Run:   docker compose -f deploy/docker-compose.yml up -d

FROM node:20-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip \
 && rm -rf /var/lib/apt/lists/*

# Bun é usado para instalar dependências (mesmo lockfile do projeto)
RUN curl -fsSL https://bun.sh/install | bash \
 && ln -s /root/.bun/bin/bun /usr/local/bin/bun

WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY . .
# Variáveis VITE_* são embutidas no bundle no build — passe via --build-arg
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN bun run build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Traz tudo que o wrangler precisa para servir o worker
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/wrangler.jsonc ./wrangler.jsonc
COPY --from=build /app/dist ./dist
COPY --from=build /app/.tanstack ./.tanstack
COPY --from=build /app/src ./src

EXPOSE 3000

# wrangler dev usa workerd local (mesmo runtime de produção da Cloudflare).
# As variáveis SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY
# são lidas a partir do .dev.vars (montado pelo docker-compose).
CMD ["bunx", "wrangler", "dev", \
     "--ip", "0.0.0.0", \
     "--port", "3000", \
     "--no-show-interactive-dev-session", \
     "--log-level", "info"]