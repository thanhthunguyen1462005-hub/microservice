FROM node:20-alpine
WORKDIR /app
COPY services/product-service/package*.json ./
RUN npm install --omit=dev
COPY services/product-service/src ./src
COPY shared /shared
ENV PRODUCT_PROTO_PATH=/shared/proto/product.proto
EXPOSE 50053
CMD ["node", "src/index.js"]
