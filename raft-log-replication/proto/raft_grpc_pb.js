// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var raft_pb = require('./raft_pb.js');

function serialize_raft_AppendRequest(arg) {
  if (!(arg instanceof raft_pb.AppendRequest)) {
    throw new Error('Expected argument of type raft.AppendRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_AppendRequest(buffer_arg) {
  return raft_pb.AppendRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_AppendResponse(arg) {
  if (!(arg instanceof raft_pb.AppendResponse)) {
    throw new Error('Expected argument of type raft.AppendResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_AppendResponse(buffer_arg) {
  return raft_pb.AppendResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_ClientOperation(arg) {
  if (!(arg instanceof raft_pb.ClientOperation)) {
    throw new Error('Expected argument of type raft.ClientOperation');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_ClientOperation(buffer_arg) {
  return raft_pb.ClientOperation.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_ClientResponse(arg) {
  if (!(arg instanceof raft_pb.ClientResponse)) {
    throw new Error('Expected argument of type raft.ClientResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_ClientResponse(buffer_arg) {
  return raft_pb.ClientResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_VoteRequest(arg) {
  if (!(arg instanceof raft_pb.VoteRequest)) {
    throw new Error('Expected argument of type raft.VoteRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_VoteRequest(buffer_arg) {
  return raft_pb.VoteRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_VoteResponse(arg) {
  if (!(arg instanceof raft_pb.VoteResponse)) {
    throw new Error('Expected argument of type raft.VoteResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_VoteResponse(buffer_arg) {
  return raft_pb.VoteResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var RaftService = exports.RaftService = {
  requestVote: {
    path: '/raft.Raft/RequestVote',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.VoteRequest,
    responseType: raft_pb.VoteResponse,
    requestSerialize: serialize_raft_VoteRequest,
    requestDeserialize: deserialize_raft_VoteRequest,
    responseSerialize: serialize_raft_VoteResponse,
    responseDeserialize: deserialize_raft_VoteResponse,
  },
  appendEntries: {
    path: '/raft.Raft/AppendEntries',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.AppendRequest,
    responseType: raft_pb.AppendResponse,
    requestSerialize: serialize_raft_AppendRequest,
    requestDeserialize: deserialize_raft_AppendRequest,
    responseSerialize: serialize_raft_AppendResponse,
    responseDeserialize: deserialize_raft_AppendResponse,
  },
  clientRequest: {
    path: '/raft.Raft/ClientRequest',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.ClientOperation,
    responseType: raft_pb.ClientResponse,
    requestSerialize: serialize_raft_ClientOperation,
    requestDeserialize: deserialize_raft_ClientOperation,
    responseSerialize: serialize_raft_ClientResponse,
    responseDeserialize: deserialize_raft_ClientResponse,
  },
};

exports.RaftClient = grpc.makeGenericClientConstructor(RaftService, 'Raft');
