FROM node:14-alpine

# Expose port
# TODO switch to ${FRONTEND_WEBSERVER_PORT}
EXPOSE 3000

# Start
WORKDIR /home/node/app

# TODO find a way to toggle between dev and normal npm run (env var?)
# ENTRYPOINT [ "npm", "run", "start" ]
ENTRYPOINT [ "npm", "run", "dev" ]
