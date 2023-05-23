FROM node:14-alpine AS base

ARG FRONTEND_WEBSERVER_PORT
ENV FRONTEND_WEBSERVER_PORT=$FRONTEND_WEBSERVER_PORT

# Retain installed node modules between runs. Production always installs them fresh anyways (npm ci).
# We can't use the deps from a host because windows and linux deps are different
# VOLUME [ "/home/node/app/node_modules" ]

WORKDIR /app

# Copy in node requirements definitions
COPY ["package.json", "package-lock.json*", "./"]



# =====================================================================================================
# Only reinstall dependencies when needed
FROM base as build_deps
WORKDIR /app

RUN npm ci



# =====================================================================================================
FROM build_deps AS development
WORKDIR /app

# The source code will be bind monuted in via docker compose, so we don't need to copy it in here

ENV NODE_ENV=development
ENV NODE_OPTIONS="--inspect"
# Enable hot reload functionality https://github.com/vercel/next.js/issues/36774#issuecomment-1444286244
ENV WATCHPACK_POLLING=true
CMD npm run dev


# =====================================================================================================
# Below based on https://github.com/vercel/next.js/blob/7fde79a9e840f3c73b60b49dd7df6849d332d07d/examples/with-docker/Dockerfile
FROM base AS builder
WORKDIR /app

COPY --from=build_deps /app/node_modules ./node_modules
# Copy the rest of the source files over
COPY [".", "./"]

RUN npm run build


# =====================================================================================================
# Below based on https://github.com/vercel/next.js/blob/7fde79a9e840f3c73b60b49dd7df6849d332d07d/examples/with-docker/Dockerfile
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV PORT=$FRONTEND_WEBSERVER_PORT

CMD ["node", "server.js"]
