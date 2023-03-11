FROM node:14-alpine AS base

ARG FRONTEND_WEBSERVER_PORT
ENV FRONTEND_WEBSERVER_PORT=$FRONTEND_WEBSERVER_PORT

# Retain installed node modules between runs. Production always installs them fresh anyways (npm ci).
# We can't use the deps from a host because windows and linux deps are different
VOLUME [ "/home/node/app/node_modules" ]

WORKDIR /home/node/app

# Copy in node requirements definitions, but don't install yet, dev and prod need different deps
COPY ["package.json", "package-lock.json*", "./"]




FROM base as buildDeps
WORKDIR /home/node/app

RUN npm install




FROM base AS development
WORKDIR /home/node/app

RUN npm install
# The source code will be bind monuted in via docker compose, so we don't need to copy it in here

ENV NODE_ENV=development
# Enable hot reload functionality https://github.com/vercel/next.js/issues/36774#issuecomment-1444286244
ENV WATCHPACK_POLLING=true
CMD npm run dev



# Below based on https://github.com/vercel/next.js/blob/7fde79a9e840f3c73b60b49dd7df6849d332d07d/examples/with-docker/Dockerfile
FROM base AS builder
WORKDIR /home/node/app

RUN npm ci --production 
# Copy the rest of the source files over
COPY [".", "./"]

RUN npm run build



FROM base AS production
WORKDIR /home/node/app

ENV NODE_ENV=production

CMD npm run start
