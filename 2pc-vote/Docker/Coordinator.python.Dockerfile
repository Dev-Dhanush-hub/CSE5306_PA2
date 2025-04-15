FROM python:3.10-slim

WORKDIR /app

COPY ../python/coordinator.py .

COPY ../python/requirements.txt .

RUN mkdir -p proto

RUN mkdir -p db

COPY ../python/proto ./proto/

RUN pip install -r requirements.txt

CMD ["python", "coordinator.py"]
