const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto', 'transaction.proto');
const DB_FILE = path.join(__dirname, 'db', 'participant.db');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    defaults: true,
    enums: String,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).proto.transaction;

// Initialize SQLite
const db = new sqlite3.Database(DB_FILE);
db.run(`CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)`);

function saveKvPair(key, value) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)`,
            [key, value],
            function (err) {
                if (err) {
                    console.log(`[Participant] Error saving key-value pair (${key}, ${value}): ${err.message}`);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

const ParticipantService = {
    Prepare: (call, callback) => {
        console.log(`[Participant] PREPARE received for tx ${call.request.transaction_id}`);
        callback(null, {
            transaction_id: call.request.transaction_id,
            status: "READY",
        });
    },

    Commit: async (call, callback) => {
        console.log(`[Participant] COMMIT received for tx ${call.request.transaction_id}`);
        try {
            const data = JSON.parse(call.request.payload);
            const { key, value } = data;
            await saveKvPair(key, value);
            callback(null, {
                transaction_id: call.request.transaction_id,
                status: "COMMITTED",
            });
        } catch (err) {
            console.log(`[Participant] Invalid payload in COMMIT: ${err.message}`);
            callback(null, {
                transaction_id: call.request.transaction_id,
                status: "FAILED",
            });
        }
    },

    Abort: (call, callback) => {
        console.log(`[Participant] ABORT received for tx ${call.request.transaction_id}`);
        callback(null, {
            transaction_id: call.request.transaction_id,
            status: "ABORTED",
        });
    },
};

function joinCoordinator(participantAddress, retryInterval = 5000) {
    const coordinatorAddress = process.env.COORDINATOR_ADDRESS || 'localhost:8080';
    const stub = new proto.Coordinator(coordinatorAddress, grpc.credentials.createInsecure());

    function attemptJoin() {
        console.log(`[Participant] Attempting to join coordinator at ${coordinatorAddress} as ${participantAddress}`);
        stub.Join({ address: participantAddress }, (err, response) => {
            if (err) {
                console.log(`[Participant] Failed to join coordinator: ${err.message}. Retrying in ${retryInterval / 1000}s...`);
                setTimeout(attemptJoin, retryInterval);
            } else {
                console.log(`[Participant] Successfully joined coordinator: ${response.status}`);
            }
        });
    }

    attemptJoin();
}

function main() {
    const port = process.env.PORT || '8081';
    const participantAddress = `${process.env.HOSTNAME || 'localhost'}:${port}`;

    const server = new grpc.Server();
    server.addService(proto.Participant.service, ParticipantService);

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error(`[Participant] Server error: ${err.message}`);
                return;
            }
            console.log(`[Participant] Running on port ${port}`);
            setTimeout(() => joinCoordinator(participantAddress), 1000);
        }
    );
}

main();
