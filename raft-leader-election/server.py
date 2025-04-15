import grpc
from concurrent import futures
from proto import raft_pb2
from proto import raft_pb2_grpc
import time
import threading
import random
import os

# ========== Raft Server State ==========
class RaftNode(raft_pb2_grpc.RaftServicer):
    def __init__(self, node_id, peers):
        self.node_id = node_id
        self.peers = peers
        self.current_term = 0
        self.voted_for = None
        self.state = 'follower'
        self.lock = threading.Lock()

        self.votes_received = 0
        self.leader_id = None
        self.last_heartbeat = time.time()
        self.election_timeout = self.reset_election_timeout()

        # Start background threads
        threading.Thread(target=self.election_timer, daemon=True).start()
        threading.Thread(target=self.heartbeat_sender, daemon=True).start()

    def reset_election_timeout(self):
        timeout = random.uniform(1.5, 3.0)
        print(f"[Node {self.node_id}] Election timeout reset to {timeout:.2f} seconds")
        return timeout

    # ========== RPC Server Methods ==========
    def RequestVote(self, request, context):
        with self.lock:
            print(f"[Node {self.node_id}] RPC RequestVote from Node {request.candidateId} | Term {request.term}")
            if request.term < self.current_term:
                return raft_pb2.VoteResponse(term=self.current_term, voteGranted=False)

            if request.term > self.current_term:
                self.current_term = request.term
                self.voted_for = None

            if self.voted_for is None or self.voted_for == request.candidateId:
                self.voted_for = request.candidateId
                self.state = 'follower'
                self.last_heartbeat = time.time()
                return raft_pb2.VoteResponse(term=self.current_term, voteGranted=True)

            return raft_pb2.VoteResponse(term=self.current_term, voteGranted=False)

    def AppendEntries(self, request, context):
        with self.lock:
            print(f"[Node {self.node_id}] RPC AppendEntries from Leader {request.leaderId} | Term {request.term}")
            if request.term < self.current_term:
                return raft_pb2.AppendResponse(term=self.current_term, success=False)

            if request.term > self.current_term:
                self.current_term = request.term
                self.voted_for = None

            self.state = 'follower'
            self.leader_id = request.leaderId
            self.last_heartbeat = time.time()
            return raft_pb2.AppendResponse(term=self.current_term, success=True)

    # ========== Election Timer Logic ==========
    def election_timer(self):
        while True:
            time.sleep(0.1)
            with self.lock:
                if self.state == 'leader':
                    continue
                if time.time() - self.last_heartbeat >= self.election_timeout:
                    self.start_election()

    # ========== Start Election ==========
    def start_election(self):
        self.state = 'candidate'
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = 1
        self.last_heartbeat = time.time()
        self.election_timeout = self.reset_election_timeout()

        print(f"[Node {self.node_id}] Starting election for Term {self.current_term}")

        for peer in self.peers:
            threading.Thread(target=self.send_request_vote, args=(peer,), daemon=True).start()

    # ========== Send RequestVote RPC ==========
    def send_request_vote(self, peer_address):
        try:
            with grpc.insecure_channel(peer_address) as channel:
                stub = raft_pb2_grpc.RaftStub(channel)
                print(f"[Node {self.node_id}] Sending RequestVote to {peer_address}")
                response = stub.RequestVote(
                    raft_pb2.VoteRequest(term=self.current_term, candidateId=self.node_id)
                )
                with self.lock:
                    if response.term > self.current_term:
                        self.current_term = response.term
                        self.state = 'follower'
                        self.voted_for = None
                        return
                    if response.voteGranted:
                        self.votes_received += 1
                        if self.votes_received > (len(self.peers) + 1) // 2 and self.state == 'candidate':
                            self.become_leader()
        except Exception as e:
            print(f"[Node {self.node_id}] Failed to contact {peer_address} during election - {e}")

    def become_leader(self):
        print(f"[Node {self.node_id}] Became leader in Term {self.current_term}")
        self.state = 'leader'
        self.leader_id = self.node_id
        self.last_heartbeat = time.time()

    # ========== Send Heartbeats ==========
    def heartbeat_sender(self):
        while True:
            time.sleep(1)  # Heartbeat interval is 1 second
            with self.lock:
                if self.state != 'leader':
                    continue
            for peer in self.peers:
                threading.Thread(target=self.send_append_entries, args=(peer,), daemon=True).start()

    def send_append_entries(self, peer_address):
        try:
            with grpc.insecure_channel(peer_address) as channel:
                stub = raft_pb2_grpc.RaftStub(channel)
                print(f"[Node {self.node_id}] Sending AppendEntries to {peer_address}")
                response = stub.AppendEntries(
                    raft_pb2.AppendRequest(term=self.current_term, leaderId=self.node_id)
                )
                with self.lock:
                    if response.term > self.current_term:
                        self.current_term = response.term
                        self.state = 'follower'
                        self.voted_for = None
        except Exception as e:
            print(f"[Node {self.node_id}] Failed to send heartbeat to {peer_address} - {e}")

# ========== Server Setup ==========
def serve(node_id, port, peers):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    raft_node = RaftNode(node_id, peers)
    raft_pb2_grpc.add_RaftServicer_to_server(raft_node, server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"[Node {node_id}] Running on port {port}")
    server.wait_for_termination()

# ========== Main ==========
if __name__ == '__main__':
    node_identifier = int(os.environ.get('NODE_ID', random.randint(1000, 9999)))
    node_port = int(os.environ.get('PORT', 5000))
    node_peers = os.environ.get('PEERS', '')  # comma-separated string
    peer_list = [p.strip() for p in node_peers.split(',')] if node_peers else []

    serve(node_identifier, node_port, peer_list)
