const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const os = require('os');

const PROTO_PATH = './proto/raft.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const raftProto = grpc.loadPackageDefinition(packageDefinition).raft;

class RaftNode {
    constructor(nodeId, peers) {
        this.nodeId = nodeId;
        this.peers = peers;
        this.currentTerm = 0;
        this.votedFor = null;
        this.state = 'follower';
        this.votesReceived = 0;
        this.leaderId = null;
        this.lastHeartbeat = Date.now();
        this.electionTimeout = this.resetElectionTimeout();

        // Start election timer and heartbeat sender
        setInterval(() => this.electionTimer(), 100);
        setInterval(() => this.heartbeatSender(), 1000);
    }

    resetElectionTimeout() {
        const timeout = Math.random() * 1500 + 1500;
        console.log(`[Node ${this.nodeId}] Election timeout reset to ${timeout.toFixed(0)} ms`);
        return timeout;
    }

    // ===== RPC Handlers =====

    RequestVote(call, callback) {
        const request = call.request;
        console.log(`[Node ${this.nodeId}] RPC RequestVote from Node ${request.candidateId} | Term ${request.term}`);

        if (request.term < this.currentTerm) {
            return callback(null, { term: this.currentTerm, voteGranted: false });
        }

        if (request.term > this.currentTerm) {
            this.currentTerm = request.term;
            this.votedFor = null;
        }

        if (!this.votedFor || this.votedFor === request.candidateId) {
            this.votedFor = request.candidateId;
            this.state = 'follower';
            this.lastHeartbeat = Date.now();
            return callback(null, { term: this.currentTerm, voteGranted: true });
        }

        callback(null, { term: this.currentTerm, voteGranted: false });
    }

    AppendEntries(call, callback) {
        const request = call.request;
        console.log(`[Node ${this.nodeId}] RPC AppendEntries from Leader ${request.leaderId} | Term ${request.term}`);

        if (request.term < this.currentTerm) {
            return callback(null, { term: this.currentTerm, success: false });
        }

        if (request.term > this.currentTerm) {
            this.currentTerm = request.term;
            this.votedFor = null;
        }

        this.state = 'follower';
        this.leaderId = request.leaderId;
        this.lastHeartbeat = Date.now();

        callback(null, { term: this.currentTerm, success: true });
    }

    // ===== Election Logic =====

    electionTimer() {
        if (this.state === 'leader') return;
        const elapsed = Date.now() - this.lastHeartbeat;
        if (elapsed >= this.electionTimeout) {
            this.startElection();
        }
    }

    startElection() {
        this.state = 'candidate';
        this.currentTerm += 1;
        this.votedFor = this.nodeId;
        this.votesReceived = 1;
        this.lastHeartbeat = Date.now();
        this.electionTimeout = this.resetElectionTimeout();

        console.log(`[Node ${this.nodeId}] Starting election for Term ${this.currentTerm}`);

        this.peers.forEach(peer => {
            this.sendRequestVote(peer);
        });
    }

    sendRequestVote(peer) {
        const client = new raftProto.Raft(peer, grpc.credentials.createInsecure());
        const request = { term: this.currentTerm, candidateId: this.nodeId };

        console.log(`[Node ${this.nodeId}] Sending RequestVote to ${peer}`);
        client.RequestVote(request, (err, response) => {
            if (err) {
                console.log(`[Node ${this.nodeId}] Failed to contact ${peer} during election - ${err.message}`);
                return;
            }

            if (response.term > this.currentTerm) {
                this.currentTerm = response.term;
                this.state = 'follower';
                this.votedFor = null;
                return;
            }

            if (response.voteGranted && this.state === 'candidate') {
                this.votesReceived += 1;
                if (this.votesReceived > (this.peers.length + 1) / 2) {
                    this.becomeLeader();
                }
            }
        });
    }

    becomeLeader() {
        console.log(`[Node ${this.nodeId}] Became leader in Term ${this.currentTerm}`);
        this.state = 'leader';
        this.leaderId = this.nodeId;
        this.lastHeartbeat = Date.now();
    }

    heartbeatSender() {
        if (this.state !== 'leader') return;

        this.peers.forEach(peer => {
            this.sendAppendEntries(peer);
        });
    }

    sendAppendEntries(peer) {
        const client = new raftProto.Raft(peer, grpc.credentials.createInsecure());
        const request = { term: this.currentTerm, leaderId: this.nodeId };

        console.log(`[Node ${this.nodeId}] Sending AppendEntries to ${peer}`);
        client.AppendEntries(request, (err, response) => {
            if (err) {
                console.log(`[Node ${this.nodeId}] Failed to send heartbeat to ${peer} - ${err.message}`);
                return;
            }

            if (response.term > this.currentTerm) {
                this.currentTerm = response.term;
                this.state = 'follower';
                this.votedFor = null;
            }
        });
    }
}

// ===== Server Setup =====

function main() {
    const nodeId = parseInt(process.env.NODE_ID) || Math.floor(1000 + Math.random() * 9000);
    const port = parseInt(process.env.PORT) || 5000;
    const peers = process.env.PEERS ? process.env.PEERS.split(',').map(p => p.trim()) : [];

    const server = new grpc.Server();
    const raftNode = new RaftNode(nodeId, peers);

    server.addService(raftProto.Raft.service, {
        RequestVote: raftNode.RequestVote.bind(raftNode),
        AppendEntries: raftNode.AppendEntries.bind(raftNode)
    });

    const address = `0.0.0.0:${port}`;
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
        console.log(`[Node ${nodeId}] Running on port ${port}`);
        server.start();
    });
}

main();
