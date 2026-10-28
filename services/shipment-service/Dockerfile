FROM node:20-alpine
WORKDIR /app
COPY services/shipment-service/package*.json ./
RUN npm install --omit=dev
COPY services/shipment-service/src ./src
COPY shared /shared
ENV SHIPMENT_PROTO_PATH=/shared/proto/shipment.proto
EXPOSE 50055
CMD ["node", "src/index.js"]
