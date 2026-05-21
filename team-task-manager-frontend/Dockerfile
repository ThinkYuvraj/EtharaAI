FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE=https://etharaai-production-1340.up.railway.app
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY server.mjs ./server.mjs
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["node", "server.mjs"]
