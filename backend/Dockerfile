FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE ${BACKEND_PORT}

CMD ["node", "src/index.js"]
