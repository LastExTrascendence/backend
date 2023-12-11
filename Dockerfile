FROM node:21-alpine.3.18

WORKDIR /app

RUN npm install && \
    npm i -g @nestjs/cli

EXPOSE 3000

ENTRYPOINT [ "/bin/sh", "-c", "npm run start:dev" ]
