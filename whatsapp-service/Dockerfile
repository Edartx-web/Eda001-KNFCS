FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# sessions/ is mounted as a persistent volume in production
RUN mkdir -p /app/sessions

EXPOSE 3001

CMD ["node", "index.js"]
