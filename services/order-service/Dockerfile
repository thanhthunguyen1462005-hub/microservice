FROM node:20-alpine
WORKDIR /app
COPY services/order-service/package*.json ./
RUN npm install --omit=dev
COPY services/order-service/src ./src
COPY shared /shared
ENV ORDER_PROTO_PATH=/shared/proto/order.proto
ENV CUSTOMER_PROTO_PATH=/shared/proto/customer.proto
ENV PRODUCT_PROTO_PATH=/shared/proto/product.proto
EXPOSE 50054
CMD ["node", "src/index.js"]
