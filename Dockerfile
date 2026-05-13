# Autodialer — Next.js 16 production image
#
# Matches local `.env.production` + `npm run prod` behavior: `NEXT_PUBLIC_*`
# is baked in at build time.
#
# Option A — put `.env.production` beside this Dockerfile on the server (same as
# your repo; not committed to git). Then:
#   docker build -t autodialer .
#
# Option B — pass URLs at build time (login proxies vs everything else):
#   docker build -t autodialer \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_AUTH_BASE_URL=https://auth.example.com \
#     .
#
# Run:
#   docker run -p 3000:3000 autodialer
#
# Optional — listen port inside the container (your `.env.production` may set PORT=3000):
#   docker run -p 8080:8080 -e PORT=8080 autodialer

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then \
  export NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL"; \
  fi && \
  npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_AUTH_BASE_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_AUTH_BASE_URL=${NEXT_PUBLIC_AUTH_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
