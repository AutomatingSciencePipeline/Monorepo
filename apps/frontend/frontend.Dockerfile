FROM node:14-alpine

# TODO find a way to toggle between dev and prod
# ENV NODE_ENV=production
ENV NODE_ENV=development

# Retain installed node modules
VOLUME [ "/home/node/app/node_modules" ]

# Expose port
# TODO switch to ${FRONTEND_WEBSERVER_PORT}
EXPOSE 3000

WORKDIR /home/node/app

# Install node modules
COPY ["package.json", "package-lock.json*", "./"]
# TODO find a way to toggle between dev and prod
RUN npm install
# RUN npm install --production

# Copy the rest of the source files over
COPY [".", "./"]

# TODO find a way to toggle between dev and normal npm run (env var?)
# ENTRYPOINT [ "npm", "run", "start" ]
ENTRYPOINT [ "npm", "run", "dev" ]
