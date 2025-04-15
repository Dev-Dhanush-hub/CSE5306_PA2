FROM python:3.10-slim

WORKDIR /app

COPY ../python/coordinator.py .

RUN mkdir -p proto

RUN mkdir -p db

COPY ../python/proto ./proto/

RUN pip install grpcio grpcio-tools

CMD ["python", "coordinator.py"]
