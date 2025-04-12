FROM python:3.11-slim

# Install grpcio-tools
RUN pip install grpcio grpcio-tools

# Set working directory
WORKDIR /app

# Copy files
COPY . /app

# Compile proto file inside the container
RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. raft.proto

# Install requirements
RUN pip install -r requirements.txt

CMD ["python", "run_node.py"]
