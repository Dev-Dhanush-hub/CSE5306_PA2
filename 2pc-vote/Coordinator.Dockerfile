FROM python:3.10-slim

WORKDIR /app

COPY coordinator.py .

RUN mkdir -p proto

COPY ./proto ./proto/

RUN pip install grpcio grpcio-tools

CMD ["python", "coordinator.py"]
