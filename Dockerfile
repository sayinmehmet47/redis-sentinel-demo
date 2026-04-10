FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
