FROM python:3.10-slim

WORKDIR /app

COPY participant.py .

RUN mkdir -p proto

COPY ./proto ./proto/

RUN pip install grpcio grpcio-tools

CMD ["python", "participant.py"]

