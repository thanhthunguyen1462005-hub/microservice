FROM node:20-alpine
WORKDIR /app
COPY services/api-gateway/package*.json ./
RUN npm install --omit=dev
COPY services/api-gateway/src ./src
COPY shared /shared
ENV AUTH_PROTO_PATH=/shared/proto/auth.proto
ENV CUSTOMER_PROTO_PATH=/shared/proto/customer.proto
ENV PRODUCT_PROTO_PATH=/shared/proto/product.proto
ENV ORDER_PROTO_PATH=/shared/proto/order.proto
ENV SHIPMENT_PROTO_PATH=/shared/proto/shipment.proto
EXPOSE 8080
CMD ["node", "src/index.js"]
