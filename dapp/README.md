# GameFi Economy — Frontend

Next.js 14 + TypeScript + wagmi v2 + RainbowKit frontend for the GameFi Economy protocol.

## Stack

- **Next.js 14** (App Router)
- **wagmi v2** + **viem** — contract reads/writes
- **RainbowKit** — wallet connection (MetaMask, WalletConnect, Coinbase)
- **@tanstack/react-query** — async state
- **Tailwind CSS** — styling
- **Fonts**: Syne (display) + DM Sans (body) + JetBrains Mono

## Pages

| Route        | Description                                    | Write Txns        |
|---|---|---|
| `/`          | Dashboard — balances overview                  | —                 |
| `/inventory` | ERC-1155 token balances                        | —                 |
| `/craft`     | Burn elements → mint pony NFT                  | `craft(ponyId)`   |
| `/amm`       | Swap tokens on the AMM                         | `swap()`          |
| `/vault`     | ERC-4626 deposit/withdraw + NFT staking        | `deposit()` / `stakeNFT()` |
| `/dao`       | Proposals list + castVote + propose            | `castVote()` / `propose()` |

## Write Transactions (3 required)

1. **`craft(ponyId)`** — `/craft` page — burns Elements of Harmony, mints Pinkie Pie or Starlight Glimmer
2. **`swap(tokenIn, amountIn, minAmountOut)`** — `/amm` page — AMM token swap with slippage protection
3. **`deposit(assets, receiver)`** — `/vault` page — ERC-4626 deposit into NFT Rental Vault

## Setup

```bash
npm install
npm run dev
```

## Configuration

1. **Replace contract addresses** in `src/lib/contracts.ts`:
   ```ts
   export const ADDRESSES = {
     equestria1155:    "0x...",
     amm:              "0x...",
     governanceToken:  "0x...",
     myGovernor:       "0x...",
     nftRentalVault:   "0x...",
     vrfConsumer:      "0x...",
     gameTokenFactory: "0x...",
     gameToken:        "0x...",
   };
   ```

2. **WalletConnect Project ID** in `src/lib/wagmi.ts`:
   ```ts
   projectId: "YOUR_WALLETCONNECT_PROJECT_ID"
   ```
   Get one free at https://cloud.walletconnect.com

3. **Supported networks**: Arbitrum Sepolia, Base Sepolia, Hardhat (local)

## Subgraph Integration (TODO)

DAO proposals are currently shown as dummy data. Once the subgraph is deployed:

1. Install Apollo Client: `npm install @apollo/client graphql`
2. Create `src/lib/apollo.ts` with your Graph Studio endpoint
3. Replace dummy proposals in `/dao` with a real GraphQL query:
   ```graphql
   query GetProposals {
     proposalCreateds(orderBy: blockTimestamp, orderDirection: desc) {
       proposalId
       description
       proposer
       voteStart
       voteEnd
     }
   }
   ```
