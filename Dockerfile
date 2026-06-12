FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npx nest build

EXPOSE 8080

CMD ["npm", "run", "start:migrate"]