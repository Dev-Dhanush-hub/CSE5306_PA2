import sys
import asyncio
from raft_node import RaftNode

if __name__ == "__main__":
    node_id = int(sys.argv[1])
    all_nodes = [(i, f"localhost:{50050 + i}") for i in range(3)]  # Example: 3 nodes
    peers = [node for node in all_nodes if node[0] != node_id]

    node = RaftNode(node_id, peers)
    asyncio.run(node.start())
