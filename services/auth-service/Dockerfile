FROM node:20-alpine
WORKDIR /app
COPY services/auth-service/package*.json ./
RUN npm install --omit=dev
COPY services/auth-service/src ./src
COPY shared /shared
ENV AUTH_PROTO_PATH=/shared/proto/auth.proto
EXPOSE 50051
CMD ["node", "src/index.js"]
