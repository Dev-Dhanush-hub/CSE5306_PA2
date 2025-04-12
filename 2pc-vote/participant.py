import os
import grpc
from concurrent import futures
import time
from proto import transaction_pb2, transaction_pb2_grpc

class ParticipantServicer(transaction_pb2_grpc.ParticipantServicer):
    def __init__(self):
        self.transactions = {}

    def Prepare(self, request, context):
        print(f"[Participant] PREPARE received for tx {request.transaction_id}")
        self.transactions[request.transaction_id] = "PREPARED"
        return transaction_pb2.Response(transaction_id=request.transaction_id, status="READY")

    def Commit(self, request, context):
        print(f"[Participant] COMMIT received for tx {request.transaction_id}")
        self.transactions[request.transaction_id] = "COMMITTED"
        return transaction_pb2.Response(transaction_id=request.transaction_id, status="COMMITTED")

    def Abort(self, request, context):
        print(f"[Participant] ABORT received for tx {request.transaction_id}")
        self.transactions[request.transaction_id] = "ABORTED"
        return transaction_pb2.Response(transaction_id=request.transaction_id, status="ABORTED")

def join_coordinator(participant_address, retry_interval=5):
    coordinator_address = os.environ.get("COORDINATOR_ADDRESS", "localhost:8080")

    while True:
        print(f"[Participant] Attempting to join coordinator at {coordinator_address} as {participant_address}")
        try:
            channel = grpc.insecure_channel(coordinator_address)
            stub = transaction_pb2_grpc.CoordinatorStub(channel)
            response = stub.Join(transaction_pb2.JoinRequest(address=participant_address))
            print(f"[Participant] Successfully joined coordinator: {response.status}")
            break
        except grpc.RpcError as e:
            print(f"[Participant] Failed to join coordinator: {e}. Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)

def serve():
    port = os.environ.get("PORT", "8081")
    participant_address = f"{os.environ.get('HOSTNAME', 'participant')}:{port}"

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=5))
    transaction_pb2_grpc.add_ParticipantServicer_to_server(ParticipantServicer(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"[Participant] Running on port {port}")

    # Give server a sec to start before joining
    time.sleep(1)
    join_coordinator(participant_address)

    server.wait_for_termination()

if __name__ == '__main__':
    serve()
