const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = './proto/raft.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const raftProto = grpc.loadPackageDefinition(packageDefinition).raft;

const targetNode = process.argv[2] || 'localhost:5001';
const operation = process.argv[3] || 'set x=5';

const client = new raftProto.Raft(targetNode, grpc.credentials.createInsecure());

console.log(`Sending ClientRequest to Node at ${targetNode} with operation: "${operation}"`);
client.ClientRequest({ operation }, (err, response) => {
    if (err) console.error('RPC Error:', err);
    else console.log('Response:', response.message);
});
