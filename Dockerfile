FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app



COPY package.json pnpm-lock.yaml ./
RUN npm install 

FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_KEYGEN_API_URL=https://licence.recent.cloud/v1
ARG NEXT_PUBLIC_KEYGEN_SINGLEPLAYER=true

ENV NEXT_PUBLIC_KEYGEN_API_URL=$NEXT_PUBLIC_KEYGEN_API_URL
ENV NEXT_PUBLIC_KEYGEN_SINGLEPLAYER=$NEXT_PUBLIC_KEYGEN_SINGLEPLAYER

RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
