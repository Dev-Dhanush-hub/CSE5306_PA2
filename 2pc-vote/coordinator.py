import os
import grpc
import time
import json
import sqlite3
from concurrent import futures
from threading import Lock
from proto import transaction_pb2, transaction_pb2_grpc

PARTICIPANTS_FILE = "participants.json"
DB_FILE = "db/kv_store.db"

class CoordinatorServicer(transaction_pb2_grpc.CoordinatorServicer):
    def __init__(self):
        self.lock = Lock()
        self.db_lock = Lock()
        self.conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        self.create_kv_table()
        self.participants = self.load_participants()
        print(f"[Coordinator] Active participants: {self.participants}")

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
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO kv_store (key, value)
                VALUES (?, ?)
            """, (key, value))
            self.conn.commit()

    def load_participants(self):
        if os.path.exists(PARTICIPANTS_FILE):
            with open(PARTICIPANTS_FILE, "r") as f:
                return json.load(f)
        return []

    def save_participants(self):
        with open(PARTICIPANTS_FILE, "w") as f:
            json.dump(self.participants, f)

    def Join(self, request, context):
        with self.lock:
            address = request.address.strip()
            if address and address not in self.participants:
                self.participants.append(address)
                self.save_participants()
                print(f"[Coordinator] New participant joined: {address}")
                return transaction_pb2.JoinResponse(status="REGISTERED")
            elif address in self.participants:
                return transaction_pb2.JoinResponse(status="ALREADY_REGISTERED")
            else:
                return transaction_pb2.JoinResponse(status="FAILED")

    def StartTransaction(self, request, context):
        transaction_id = request.transaction_id
        payload = request.payload
        print(f"[Coordinator] Starting transaction {transaction_id} with payload {payload}")

        try:
            data = json.loads(payload)
            key = data["key"]
            value = data["value"]
        except (json.JSONDecodeError, KeyError):
            print(f"[Coordinator] Invalid payload format")
            return transaction_pb2.Response(transaction_id=transaction_id, status="ABORTED")

        responses = []

        for address in self.participants:
            try:
                channel = grpc.insecure_channel(address)
                stub = transaction_pb2_grpc.ParticipantStub(channel)
                response = stub.Prepare(transaction_pb2.Request(transaction_id=transaction_id, payload=payload))
                responses.append(response.status)
            except Exception as e:
                print(f"[Coordinator] Error contacting {address}: {e}")
                responses.append("FAILED")

        if all(r == "READY" for r in responses):
            print(f"[Coordinator] All participants ready. Sending COMMIT.")
            for address in self.participants:
                stub = transaction_pb2_grpc.ParticipantStub(grpc.insecure_channel(address))
                stub.Commit(transaction_pb2.Request(transaction_id=transaction_id, payload=payload))

            self.save_kv_pair(key, value)
            return transaction_pb2.Response(transaction_id=transaction_id, status="COMMITTED")
        else:
            print(f"[Coordinator] Not all participants ready. Sending ABORT.")
            for address in self.participants:
                stub = transaction_pb2_grpc.ParticipantStub(grpc.insecure_channel(address))
                stub.Abort(transaction_pb2.Request(transaction_id=transaction_id, payload=payload))

            return transaction_pb2.Response(transaction_id=transaction_id, status="ABORTED")



def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=5))
    transaction_pb2_grpc.add_CoordinatorServicer_to_server(CoordinatorServicer(), server)
    port = os.environ.get("PORT", "8080")
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"[Coordinator] Starting service on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    if not os.path.exists(PARTICIPANTS_FILE):
        with open(PARTICIPANTS_FILE, "w") as f:
            json.dump([], f)
    serve()
