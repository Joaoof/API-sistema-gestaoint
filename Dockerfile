FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY .env ./

RUN apk add --no-cache bash

COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY prisma ./prisma/
RUN npx prisma generate

COPY .env ./

RUN apk add --no-cache bash

COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

COPY dist /app/dist

CMD ["node", "dist/src/main.js"]

