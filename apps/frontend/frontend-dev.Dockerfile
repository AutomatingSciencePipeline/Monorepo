FROM node:20-alpine AS base

# Add essential utilities
RUN apk add --no-cache bash libc6-compat

WORKDIR /usr/src/app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install -g pnpm
RUN pnpm import
RUN pnpm install --frozen-lockfile

# Install sharp to optimize images
RUN pnpm add sharp

# # Build the application
# FROM base AS builder
# RUN npm install -g pnpm
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN pnpm run build

# # Prepare the production image
# FROM base AS runner
# WORKDIR /app

# ENV NODE_ENV=production

# # Create non-root user
# RUN addgroup --system --gid 1001 nodejs && \
#     adduser --system --uid 1001 nextjs

# # Copy necessary files
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

# # Ensure proper ownership for next.js
# RUN chown -R nextjs:nodejs /app

# USER nextjs

ADD . .

# Expose the frontend port
EXPOSE $FRONTEND_WEBSERVER_PORT

CMD ["npm", "run", "dev"]