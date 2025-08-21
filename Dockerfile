FROM node:20.18.0

ENV NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=128"

WORKDIR /usr/src/app

# Copie apenas os arquivos necessários para instalar dependências
COPY package*.json ./
COPY prisma ./prisma

# Instalação
RUN npm install
RUN npx prisma generate

# Copie o restante do código fonte
COPY . .
COPY .env .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
