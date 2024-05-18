FROM node:20.6 AS base

WORKDIR /app

COPY . /app

RUN npm install

RUN npm run build

EXPOSE $FRONTEND_WEBSERVER_PORT

CMD ["npm", "start"]