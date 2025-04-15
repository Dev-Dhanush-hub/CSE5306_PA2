FROM python:3.10-slim

WORKDIR /app

COPY ../python/participant.py .

RUN mkdir -p proto

RUN mkdir -p db

COPY ../python/proto ./proto/

RUN pip install grpcio grpcio-tools

CMD ["python", "participant.py"]

