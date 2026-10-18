FROM node:20-alpine AS base

# Add essential utilities
RUN apk add --no-cache bash libc6-compat

WORKDIR /usr/src/app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

ADD . .

# Expose the frontend port
EXPOSE $FRONTEND_WEBSERVER_PORT

CMD ["npm", "run", "dev"]
