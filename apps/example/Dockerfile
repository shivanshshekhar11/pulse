FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @pulse-flags/example --docker

FROM node:22-alpine AS installer
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
ARG NEXT_PUBLIC_PULSE_API_KEY
ENV NEXT_PUBLIC_PULSE_API_KEY=$NEXT_PUBLIC_PULSE_API_KEY
ARG NEXT_PUBLIC_PULSE_URL
ENV NEXT_PUBLIC_PULSE_URL=$NEXT_PUBLIC_PULSE_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASHBOARD_URL
ENV NEXT_PUBLIC_DASHBOARD_URL=$NEXT_PUBLIC_DASHBOARD_URL
ARG NEXT_PUBLIC_DOCS_URL
ENV NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL
ARG NEXT_PUBLIC_EXAMPLE_URL
ENV NEXT_PUBLIC_EXAMPLE_URL=$NEXT_PUBLIC_EXAMPLE_URL

RUN pnpm turbo run build --filter=@pulse-flags/example...

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer /app/apps/example/public ./apps/example/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/example/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/example/.next/static ./apps/example/.next/static

EXPOSE 3002
ENV PORT=3002
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/example/server.js"]
