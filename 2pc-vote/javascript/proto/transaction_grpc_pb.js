// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var transaction_pb = require('./transaction_pb.js');

function serialize_proto_transaction_JoinRequest(arg) {
  if (!(arg instanceof transaction_pb.JoinRequest)) {
    throw new Error('Expected argument of type proto.transaction.JoinRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_proto_transaction_JoinRequest(buffer_arg) {
  return transaction_pb.JoinRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_proto_transaction_JoinResponse(arg) {
  if (!(arg instanceof transaction_pb.JoinResponse)) {
    throw new Error('Expected argument of type proto.transaction.JoinResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_proto_transaction_JoinResponse(buffer_arg) {
  return transaction_pb.JoinResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_proto_transaction_Request(arg) {
  if (!(arg instanceof transaction_pb.Request)) {
    throw new Error('Expected argument of type proto.transaction.Request');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_proto_transaction_Request(buffer_arg) {
  return transaction_pb.Request.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_proto_transaction_Response(arg) {
  if (!(arg instanceof transaction_pb.Response)) {
    throw new Error('Expected argument of type proto.transaction.Response');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_proto_transaction_Response(buffer_arg) {
  return transaction_pb.Response.deserializeBinary(new Uint8Array(buffer_arg));
}


var ParticipantService = exports.ParticipantService = {
  prepare: {
    path: '/proto.transaction.Participant/Prepare',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.Request,
    responseType: transaction_pb.Response,
    requestSerialize: serialize_proto_transaction_Request,
    requestDeserialize: deserialize_proto_transaction_Request,
    responseSerialize: serialize_proto_transaction_Response,
    responseDeserialize: deserialize_proto_transaction_Response,
  },
  commit: {
    path: '/proto.transaction.Participant/Commit',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.Request,
    responseType: transaction_pb.Response,
    requestSerialize: serialize_proto_transaction_Request,
    requestDeserialize: deserialize_proto_transaction_Request,
    responseSerialize: serialize_proto_transaction_Response,
    responseDeserialize: deserialize_proto_transaction_Response,
  },
  abort: {
    path: '/proto.transaction.Participant/Abort',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.Request,
    responseType: transaction_pb.Response,
    requestSerialize: serialize_proto_transaction_Request,
    requestDeserialize: deserialize_proto_transaction_Request,
    responseSerialize: serialize_proto_transaction_Response,
    responseDeserialize: deserialize_proto_transaction_Response,
  },
};

exports.ParticipantClient = grpc.makeGenericClientConstructor(ParticipantService, 'Participant');
var CoordinatorService = exports.CoordinatorService = {
  startTransaction: {
    path: '/proto.transaction.Coordinator/StartTransaction',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.Request,
    responseType: transaction_pb.Response,
    requestSerialize: serialize_proto_transaction_Request,
    requestDeserialize: deserialize_proto_transaction_Request,
    responseSerialize: serialize_proto_transaction_Response,
    responseDeserialize: deserialize_proto_transaction_Response,
  },
  join: {
    path: '/proto.transaction.Coordinator/Join',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.JoinRequest,
    responseType: transaction_pb.JoinResponse,
    requestSerialize: serialize_proto_transaction_JoinRequest,
    requestDeserialize: deserialize_proto_transaction_JoinRequest,
    responseSerialize: serialize_proto_transaction_JoinResponse,
    responseDeserialize: deserialize_proto_transaction_JoinResponse,
  },
  // New method
};

exports.CoordinatorClient = grpc.makeGenericClientConstructor(CoordinatorService, 'Coordinator');
