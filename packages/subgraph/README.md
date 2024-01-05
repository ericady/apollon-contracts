# Run the subgraph locally

1. Start the hardhat node in the "contracts" package:

- `yarn hardhat node --hostname 0.0.0.0`

2. Start the graph-node cluster with:

- `docker compose up`
- Make extra sure to delete the "data" directory with `sudo rm -r data/` as it persists meta data and will let your subgraph fail silently.

3. Deploy contracts with:

- using the deployment script `yarn hardhat run --network localhost scripts/999_client-test-deployment.ts`
- you can also manually interact with the contracts over the hardhat console `yarn hardhat console --network localhost`

4. Deploy the subgraph with:

- Make sure to set the correct addresses and startBlocks first!
- `yarn create-local`
- `yarn deploy-local`

5. Interact with the contracts and see the subgraph update

### Easier setup with seed scripts

For generating data to test E2E it would be too much effort to create real contracts and interact with the every time. Therefore we have seed scripts that seed the subgraph. Follow the steps above and then seed the data you need:

- `psql -h localhost -p 5432 -U graph-node -d graph-node -f scripts/seeds/seed-token_candle.sql`
- Make sure to adjust the seed scripts for your deployment! They all run against the `sgd1` schema which would be correct if you deploy the subgraph under version "1".
- You can interact and inspect the schema as you normally would with `psql -h localhost -p 5432 -U graph-node -d graph-node`
