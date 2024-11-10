# FROM node:20.6 AS base

# WORKDIR /app

# COPY . /app

# RUN npm install

# RUN npm run build

# EXPOSE $FRONTEND_WEBSERVER_PORT

# CMD ["npm", "start"]

FROM node:20-alpine AS base

FROM base AS deps

RUN apk add --no-cache bash libc6-compat
WORKDIR /app

COPY package.json ./

RUN npm update && npm install

# Install this to optimize images
RUN npm i sharp

# If you want yarn update and  install uncomment the bellow

# RUN yarn install &&  yarn upgrade

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=development
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE $FRONTEND_WEBSERVER_PORT

CMD ["node", "server.js"]