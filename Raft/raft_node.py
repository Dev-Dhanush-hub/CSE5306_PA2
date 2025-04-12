import asyncio
import random
import time
import grpc
from concurrent import futures
import raft_pb2
import raft_pb2_grpc

class RaftNode(raft_pb2_grpc.RaftServicer):
    def __init__(self, node_id, peers):
        self.node_id = node_id
        self.peers = peers  # List of (id, address)
        self.state = "follower"
        self.current_term = 0
        self.voted_for = None
        self.votes_received = set()
        self.election_timeout = self.reset_election_timeout()
        self.heartbeat_interval = 1.0
        self.last_heartbeat = time.time()

    def reset_election_timeout(self):
        return random.uniform(1.5, 3.0)

    async def start(self):
        await asyncio.gather(self.run_server(), self.run_raft_loop())

    async def run_server(self):
        server = grpc.aio.server()
        raft_pb2_grpc.add_RaftServicer_to_server(self, server)
        server.add_insecure_port(f'[::]:{50050 + self.node_id}')
        await server.start()
        print(f"Node {self.node_id} is running on port {50050 + self.node_id}")
        await server.wait_for_termination()

    async def run_raft_loop(self):
        while True:
            now = time.time()
            if self.state == "follower":
                if now - self.last_heartbeat > self.election_timeout:
                    self.state = "candidate"
                    asyncio.create_task(self.start_election())
            elif self.state == "candidate":
                if now - self.last_heartbeat > self.election_timeout:
                    asyncio.create_task(self.start_election())
            elif self.state == "leader":
                await self.send_heartbeats()
                await asyncio.sleep(self.heartbeat_interval)
            await asyncio.sleep(0.1)

    async def start_election(self):
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = {self.node_id}
        self.last_heartbeat = time.time()
        self.election_timeout = self.reset_election_timeout()
        print(f"Node {self.node_id} becomes candidate for term {self.current_term}")

        for peer_id, address in self.peers:
            asyncio.create_task(self.send_request_vote(peer_id, address))

    async def send_request_vote(self, peer_id, address):
        print(f"Node {self.node_id} sends RPC RequestVote to Node {peer_id}")
        try:
            async with grpc.aio.insecure_channel(address) as channel:
                stub = raft_pb2_grpc.RaftStub(channel)
                response = await stub.RequestVote(
                    raft_pb2.RequestVoteRequest(term=self.current_term, candidate_id=self.node_id)
                )
                if response.vote_granted:
                    self.votes_received.add(peer_id)
                if len(self.votes_received) > len(self.peers) // 2 and self.state == "candidate":
                    print(f"Node {self.node_id} wins election and becomes leader for term {self.current_term}")
                    self.state = "leader"
        except:
            pass

    async def send_heartbeats(self):
        for peer_id, address in self.peers:
            asyncio.create_task(self.send_append_entries(peer_id, address))

    async def send_append_entries(self, peer_id, address):
        print(f"Node {self.node_id} sends RPC AppendEntries to Node {peer_id}")
        try:
            async with grpc.aio.insecure_channel(address) as channel:
                stub = raft_pb2_grpc.RaftStub(channel)
                await stub.AppendEntries(
                    raft_pb2.AppendEntriesRequest(term=self.current_term, leader_id=self.node_id)
                )
        except:
            pass

    async def RequestVote(self, request, context):
        print(f"Node {self.node_id} runs RPC RequestVote called by Node {request.candidate_id}")
        if request.term > self.current_term:
            self.current_term = request.term
            self.voted_for = None
            self.state = "follower"

        vote_granted = False
        if self.voted_for in [None, request.candidate_id]:
            vote_granted = True
            self.voted_for = request.candidate_id
            self.last_heartbeat = time.time()

        return raft_pb2.RequestVoteResponse(term=self.current_term, vote_granted=vote_granted)

    async def AppendEntries(self, request, context):
        print(f"Node {self.node_id} runs RPC AppendEntries called by Node {request.leader_id}")
        if request.term >= self.current_term:
            self.current_term = request.term
            self.voted_for = None
            self.state = "follower"
            self.last_heartbeat = time.time()
            return raft_pb2.AppendEntriesResponse(term=self.current_term, success=True)
        else:
            return raft_pb2.AppendEntriesResponse(term=self.current_term, success=False)
