import os
import grpc
import time
import json
import sqlite3
from concurrent import futures
from threading import Lock
from proto import transaction_pb2, transaction_pb2_grpc

DB_FILE = "db/participant.db"

class ParticipantServicer(transaction_pb2_grpc.ParticipantServicer):
    def __init__(self):
        self.db_lock = Lock()
        self.conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        self.create_kv_table()

    def create_kv_table(self):
        with self.db_lock:
            cursor = self.conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kv_store (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)
            self.conn.commit()

    def save_kv_pair(self, key, value):
        with self.db_lock:
            try:
                cursor = self.conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO kv_store (key, value)
                    VALUES (?, ?)
                """, (key, value))
                self.conn.commit()
                return True
            except Exception as e:
                print(f"[Participant] Error saving key-value pair ({key}, {value}): {e}")
                return False

    def Prepare(self, request, context):
        print(f"[Participant] PREPARE received for tx {request.transaction_id}")
        # Simulate prep success without DB write
        return transaction_pb2.Response(transaction_id=request.transaction_id, status="READY")

    def Commit(self, request, context):
        print(f"[Participant] COMMIT received for tx {request.transaction_id}")
        try:
            data = json.loads(request.payload)
            key = data["key"]
            value = data["value"]
        except (json.JSONDecodeError, KeyError) as e:
            print(f"[Participant] Invalid payload in COMMIT: {e}")
            return transaction_pb2.Response(transaction_id=request.transaction_id, status="FAILED")

        success = self.save_kv_pair(key, value)
        status = "COMMITTED" if success else "FAILED"
        return transaction_pb2.Response(transaction_id=request.transaction_id, status=status)

    def Abort(self, request, context):
        print(f"[Participant] ABORT received for tx {request.transaction_id}")
        # Nothing to rollback in this simplified version
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
    participant_address = f"{os.environ.get('HOSTNAME', 'localhost')}:{port}"

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
