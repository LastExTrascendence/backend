FROM node:lts-alpine3.18

WORKDIR /app

# RUN npm install && \
#     npm i -g @nestjs/cli

EXPOSE 3000

ENTRYPOINT [ "/bin/sh", "-c", "npm install && npm i -g @nestjs/cli && npm i bcrypt && npm i -D @types/bcrypt && npm run start:dev" ]
