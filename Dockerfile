FROM node:lts-alpine3.18

RUN apk upgrade --no-cache && \
    apk add --no-cache  redis \
                        curl && \
    mkdir -p /var/lib/redis && \
    mkdir -p /var/log/redis/ && \
    touch /var/log/redis/redis.log && \
    chmod 777 /var/log/redis/redis.log

COPY --chmod=644 conf/redis.conf /etc/redis.conf

WORKDIR /app

# RUN npm install && \
#     npm i -g @nestjs/cli

EXPOSE 3000

CMD ["redis-server", "/etc/redis.conf"]

ENTRYPOINT [ "npm install && npm i -g @nestjs/cli && npm i bcrypt && npm i -D @types/bcrypt && npm run start:dev" ]
