const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

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

        this.log = []; // Array of { term, command }
        this.commitIndex = -1;
        this.lastApplied = -1;

        this.nextIndex = {};
        this.matchIndex = {};

        setInterval(() => this.electionTimer(), 100);
        setInterval(() => this.heartbeatSender(), 500);
        setInterval(() => this.applyCommittedEntries(), 300);
        // setInterval(() => this.simulateClientCommand(), 5000); // Test: simulate a client request
    }

    resetElectionTimeout() {
        return Math.random() * 1500 + 1500;
    }

    ClientRequest(call, callback) {
        if (this.state !== 'leader') {
            return callback(null, {
                success: false,
                message: `Not the leader. Current leader: ${this.leaderId || 'unknown'}`
            });
        }

        const command = call.request.command;
        this.log.push({ term: this.currentTerm, command });
        console.log(`[Node ${this.nodeId}] Accepted client command: ${command}`);
        callback(null, { success: true, message: `Command '${command}' added to log` });
    }

    RequestVote(call, callback) {
        const req = call.request;
        if (req.term < this.currentTerm) {
            return callback(null, { term: this.currentTerm, voteGranted: false });
        }

        if (req.term > this.currentTerm) {
            this.currentTerm = req.term;
            this.votedFor = null;
        }

        if (!this.votedFor || this.votedFor === req.candidateId) {
            this.votedFor = req.candidateId;
            this.state = 'follower';
            this.lastHeartbeat = Date.now();
            return callback(null, { term: this.currentTerm, voteGranted: true });
        }

        callback(null, { term: this.currentTerm, voteGranted: false });
    }

    AppendEntries(call, callback) {
        const req = call.request;

        if (req.term < this.currentTerm) {
            return callback(null, { term: this.currentTerm, success: false });
        }

        this.state = 'follower';
        this.currentTerm = req.term;
        this.leaderId = req.leaderId;
        this.lastHeartbeat = Date.now();

        // Simple consistency check (would include prevLogIndex/Term for full correctness)
        for (let i = 0; i < req.entries.length; i++) {
            const entry = req.entries[i];
            const index = this.log.length + i;
            if (!this.log[index] || this.log[index].term !== entry.term) {
                this.log = this.log.slice(0, index);
                this.log.push(...req.entries.slice(i));
                break;
            }
        }

        if (req.leaderCommit > this.commitIndex) {
            this.commitIndex = Math.min(req.leaderCommit, this.log.length - 1);
        }

        callback(null, { term: this.currentTerm, success: true });
    }

    electionTimer() {
        if (this.state === 'leader') return;
        if (Date.now() - this.lastHeartbeat >= this.electionTimeout) {
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

        for (const peer of this.peers) {
            const client = new raftProto.Raft(peer, grpc.credentials.createInsecure());
            const req = { term: this.currentTerm, candidateId: this.nodeId };

            client.RequestVote(req, (err, res) => {
                if (err || !res) return;
                if (res.term > this.currentTerm) {
                    this.currentTerm = res.term;
                    this.state = 'follower';
                    this.votedFor = null;
                } else if (res.voteGranted && this.state === 'candidate') {
                    this.votesReceived += 1;
                    if (this.votesReceived > (this.peers.length + 1) / 2) {
                        this.becomeLeader();
                    }
                }
            });
        }
    }

    becomeLeader() {
        this.state = 'leader';
        this.leaderId = this.nodeId;
        for (const peer of this.peers) {
            this.nextIndex[peer] = this.log.length;
            this.matchIndex[peer] = -1;
        }
    }

    heartbeatSender() {
        if (this.state !== 'leader') return;

        for (const peer of this.peers) {
            this.replicateLog(peer);
        }
    }

    replicateLog(peer) {
        const client = new raftProto.Raft(peer, grpc.credentials.createInsecure());
        const nextIdx = this.nextIndex[peer] || 0;

        const entries = this.log.slice(nextIdx);

        const req = {
            term: this.currentTerm,
            leaderId: this.nodeId,
            entries: entries,
            leaderCommit: this.commitIndex
        };

        client.AppendEntries(req, (err, res) => {
            if (err || !res) return;
            if (res.term > this.currentTerm) {
                this.currentTerm = res.term;
                this.state = 'follower';
                this.votedFor = null;
                return;
            }

            if (res.success) {
                this.matchIndex[peer] = nextIdx + entries.length - 1;
                this.nextIndex[peer] = this.matchIndex[peer] + 1;

                this.tryCommit();
            } else {
                this.nextIndex[peer] = Math.max(0, nextIdx - 1); // Back off
            }
        });
    }

    tryCommit() {
        const match = Object.values(this.matchIndex).concat(this.log.length - 1);
        match.sort((a, b) => b - a); // descending
        const N = match[Math.floor(this.peers.length / 2)];

        if (N > this.commitIndex && this.log[N] && this.log[N].term === this.currentTerm) {
            this.commitIndex = N;
        }
    }

    applyCommittedEntries() {
        while (this.lastApplied < this.commitIndex) {
            this.lastApplied += 1;
            const entry = this.log[this.lastApplied];
            console.log(`[Node ${this.nodeId}] Applying log: ${JSON.stringify(entry)} at index ${this.lastApplied}`);
        }
    }

    simulateClientCommand() {
        if (this.state !== 'leader') return;

        const command = `set x=${Math.floor(Math.random() * 100)}`;
        this.log.push({ term: this.currentTerm, command });
        console.log(`[Node ${this.nodeId}] Received client command: ${command}`);
    }
}

function main() {
    const nodeId = parseInt(process.env.NODE_ID) || Math.floor(Math.random() * 10000);
    const port = parseInt(process.env.PORT) || 5000;
    const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

    const server = new grpc.Server();
    const node = new RaftNode(nodeId, peers);

    server.addService(raftProto.Raft.service, {
        RequestVote: node.RequestVote.bind(node),
        AppendEntries: node.AppendEntries.bind(node),
        ClientRequest: node.ClientRequest.bind(node),
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.log(`[Node ${this.nodeId}] Error: ${err.message}`);
            return;
        }
        console.log(`[Node ${nodeId}] Running on port ${port}`);
    });
}

main();
