# 2 PC Python

## Generate proto files

```bash
cd 2pc-vote
protoc -I./proto --python_out=./proto ./proto/transaction.proto
```

## Edit transaction_pb2_grpc.py
change 
```javascript
import transaction_pb2 as transaction__pb2
```
to
```javascript
from . import transaction_pb2 as transaction__pb2
```


## Run docker compse file

```bash
docker-compose up -d
```