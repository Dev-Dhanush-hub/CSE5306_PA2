FROM node:18-slim

WORKDIR /app

COPY server.js .

RUN npm install @grpc/grpc-js @grpc/proto-loader protobufjs-cli google-protobuf sqlite3

RUN mkdir -p proto

COPY proto ./proto

CMD ["node", "server.js"]