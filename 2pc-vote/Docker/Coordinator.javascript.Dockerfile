FROM node:18-slim

WORKDIR /app

COPY ../javascript/coordinator.js .

RUN mkdir -p proto

RUN mkdir -p db

COPY ../javascript/proto ./proto/

RUN npm install @grpc/grpc-js @grpc/proto-loader sqlite3

CMD ["node", "coordinator.js"]
