// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var raft_pb = require('./raft_pb.js');

function serialize_raft_AppendEntriesRequest(arg) {
  if (!(arg instanceof raft_pb.AppendEntriesRequest)) {
    throw new Error('Expected argument of type raft.AppendEntriesRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_AppendEntriesRequest(buffer_arg) {
  return raft_pb.AppendEntriesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_AppendEntriesResponse(arg) {
  if (!(arg instanceof raft_pb.AppendEntriesResponse)) {
    throw new Error('Expected argument of type raft.AppendEntriesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_AppendEntriesResponse(buffer_arg) {
  return raft_pb.AppendEntriesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_ClientCommand(arg) {
  if (!(arg instanceof raft_pb.ClientCommand)) {
    throw new Error('Expected argument of type raft.ClientCommand');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_ClientCommand(buffer_arg) {
  return raft_pb.ClientCommand.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_raft_RequestVoteRequest(arg) {
  if (!(arg instanceof raft_pb.RequestVoteRequest)) {
    throw new Error('Expected argument of type raft.RequestVoteRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_RequestVoteRequest(buffer_arg) {
  return raft_pb.RequestVoteRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_raft_RequestVoteResponse(arg) {
  if (!(arg instanceof raft_pb.RequestVoteResponse)) {
    throw new Error('Expected argument of type raft.RequestVoteResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_raft_RequestVoteResponse(buffer_arg) {
  return raft_pb.RequestVoteResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var RaftService = exports.RaftService = {
  requestVote: {
    path: '/raft.Raft/RequestVote',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.RequestVoteRequest,
    responseType: raft_pb.RequestVoteResponse,
    requestSerialize: serialize_raft_RequestVoteRequest,
    requestDeserialize: deserialize_raft_RequestVoteRequest,
    responseSerialize: serialize_raft_RequestVoteResponse,
    responseDeserialize: deserialize_raft_RequestVoteResponse,
  },
  appendEntries: {
    path: '/raft.Raft/AppendEntries',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.AppendEntriesRequest,
    responseType: raft_pb.AppendEntriesResponse,
    requestSerialize: serialize_raft_AppendEntriesRequest,
    requestDeserialize: deserialize_raft_AppendEntriesRequest,
    responseSerialize: serialize_raft_AppendEntriesResponse,
    responseDeserialize: deserialize_raft_AppendEntriesResponse,
  },
  clientRequest: {
    path: '/raft.Raft/ClientRequest',
    requestStream: false,
    responseStream: false,
    requestType: raft_pb.ClientCommand,
    responseType: raft_pb.ClientResponse,
    requestSerialize: serialize_raft_ClientCommand,
    requestDeserialize: deserialize_raft_ClientCommand,
    responseSerialize: serialize_raft_ClientResponse,
    responseDeserialize: deserialize_raft_ClientResponse,
  },
  // NEW RPC
};

exports.RaftClient = grpc.makeGenericClientConstructor(RaftService, 'Raft');
