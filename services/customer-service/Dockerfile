FROM node:20-alpine
WORKDIR /app
COPY services/customer-service/package*.json ./
RUN npm install --omit=dev
COPY services/customer-service/src ./src
COPY shared /shared
ENV CUSTOMER_PROTO_PATH=/shared/proto/customer.proto
EXPOSE 50052
CMD ["node", "src/index.js"]
