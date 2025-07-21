FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm audit fix
RUN npm install
RUN npm install -g npm@11.4.2
RUN npm install glob@^9
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm audit fix
RUN npm install -g npm@11.4.2
RUN npm install glob@^9
RUN npm install --production
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
