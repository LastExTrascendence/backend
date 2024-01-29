FROM node:lts-alpine3.18

RUN apk upgrade --no-cache && \
    apk add --no-cache curl

WORKDIR /app

COPY ./ /app

RUN npm install && \
    npm i -g @nestjs/cli && \
    npm uninstall bcrypt && \
    npm install bcrypt

EXPOSE 3000

# ENTRYPOINT [ "/bin/sh", "-c", "npm i && npm run start:dev" ]
ENTRYPOINT [ "/bin/sh", "-c", "npm install && npm install node-gyp -g && npm install bcrypt -g && npm install bcrypt --save  npm i -g @nestjs/cli && npm i bcrypt && npm i -D @types/bcrypt && npm run start:dev" ]
