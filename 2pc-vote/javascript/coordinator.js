const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto', 'transaction.proto');
const PARTICIPANTS_FILE = 'participants.json';
const DB_FILE = 'db/kv_store.db';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).proto.transaction;

let participants = [];

if (fs.existsSync(PARTICIPANTS_FILE)) {
    participants = JSON.parse(fs.readFileSync(PARTICIPANTS_FILE));
} else {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify([]));
}

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) throw err;
    db.run(`CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)`);
});

function saveKvPair(key, value) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)`,
            [key, value],
            function (err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function saveParticipants() {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2));
}

function Join(call, callback) {
    const address = call.request.address.trim();
    if (address && !participants.includes(address)) {
        participants.push(address);
        saveParticipants();
        console.log(`[Coordinator] New participant joined: ${address}`);
        callback(null, { status: 'REGISTERED' });
    } else if (participants.includes(address)) {
        callback(null, { status: 'ALREADY_REGISTERED' });
    } else {
        callback(null, { status: 'FAILED' });
    }
}

async function StartTransaction(call, callback) {
    const { transaction_id, payload } = call.request;
    console.log(`[Coordinator] Starting transaction ${transaction_id} with payload ${payload}`);

    let key, value;
    try {
        const data = JSON.parse(payload);
        key = data.key;
        value = data.value;
    } catch (e) {
        console.log("[Coordinator] Invalid payload format");
        return callback(null, { transaction_id, status: 'ABORTED' });
    }

    const responses = await Promise.all(
        participants.map((address) =>
            new Promise((resolve) => {
                const channel = new grpc.Client(address, grpc.credentials.createInsecure());
                const stub = new proto.Participant(address, grpc.credentials.createInsecure());

                stub.Prepare({ transaction_id, payload }, (err, res) => {
                    if (err) {
                        console.log(`[Coordinator] Error contacting ${address}: ${err.message}`);
                        return resolve("FAILED");
                    }
                    resolve(res.status);
                });
            })
        )
    );

    const allReady = responses.every((status) => status === 'READY');

    const action = allReady ? 'Commit' : 'Abort';
    const status = allReady ? 'COMMITTED' : 'ABORTED';

    await Promise.all(
        participants.map((address) => {
            return new Promise((resolve) => {
                const stub = new proto.Participant(address, grpc.credentials.createInsecure());
                stub[action]({ transaction_id, payload }, (err) => {
                    if (err) {
                        console.log(`[Coordinator] Failed to ${action} ${address}: ${err.message}`);
                    }
                    resolve();
                });
            });
        })
    );

    if (allReady) {
        await saveKvPair(key, value);
    }

    callback(null, { transaction_id, status });
}

function main() {
    const server = new grpc.Server();
    server.addService(proto.Coordinator.service, {
        Join,
        StartTransaction,
    });

    const port = process.env.PORT || '8080';
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error(`[Coordinator] Failed to bind server: ${err.message}`);
                return;
            }
            console.log(`[Coordinator] Starting service on port ${port}`);

        }
    );
}

main();
