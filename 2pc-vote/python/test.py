import grpc
import json
import uuid
from proto import transaction_pb2, transaction_pb2_grpc

COORDINATOR_ADDRESS = "localhost:8080"

def test_transaction(key, value):
    # Create a unique transaction ID
    transaction_id = str(uuid.uuid4())
    payload = json.dumps({"key": key, "value": value})

    # Connect to coordinator
    channel = grpc.insecure_channel(COORDINATOR_ADDRESS)
    stub = transaction_pb2_grpc.CoordinatorStub(channel)

    # Send StartTransaction request
    print(f"[Client] Sending transaction {transaction_id} with key={key}, value={value}")

    try:
        response = stub.StartTransaction(
            transaction_pb2.Request(transaction_id=transaction_id, payload=payload)
        )
    except Exception as e:
        print(f"[Client] Error contacting coordinator: {e}")
        return

    print(f"[Client] Coordinator response: {response.status} for tx {response.transaction_id}")

if __name__ == "__main__":
    # Example tests
    test_transaction("x", "123")
    test_transaction("y", "hello")
    # Overwrite test
    test_transaction("z", "456")
    # Invalid payload test
    test_transaction("invalid_key", "invalid_value")
    test_transaction("gawk", "gawk gawk prrr")
