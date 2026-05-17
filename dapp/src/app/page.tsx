"use client";
import { useAccount, useReadContracts } from "wagmi";
import { ConnectButton }                from "@rainbow-me/rainbowkit";
import Link                             from "next/link";
import {
  ADDRESSES, EQUESTRIA_1155_ABI, GOVERNANCE_TOKEN_ABI,
  NFT_RENTAL_VAULT_ABI, TOKEN_IDS,
} from "@/lib/contracts";
import { formatAmount, shortenAddress }  from "@/lib/utils";
import { StatCard, ConnectGuard }        from "@/components/ui";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data } = useReadContracts({
    contracts: address ? [
      // GOV balance
      { address: ADDRESSES.governanceToken, abi: GOVERNANCE_TOKEN_ABI,
        functionName: "balanceOf", args: [address] },
      // GOV votes
      { address: ADDRESSES.governanceToken, abi: GOVERNANCE_TOKEN_ABI,
        functionName: "getVotes", args: [address] },
      // Vault shares
      { address: ADDRESSES.nftRentalVault, abi: NFT_RENTAL_VAULT_ABI,
        functionName: "balanceOf", args: [address] },
      // Is renting
      { address: ADDRESSES.nftRentalVault, abi: NFT_RENTAL_VAULT_ABI,
        functionName: "isRenting", args: [address] },
      // HONESTY balance
      { address: ADDRESSES.equestria1155, abi: EQUESTRIA_1155_ABI,
        functionName: "balanceOf", args: [address, TOKEN_IDS.HONESTY] },
      // MAGIC balance
      { address: ADDRESSES.equestria1155, abi: EQUESTRIA_1155_ABI,
        functionName: "balanceOf", args: [address, TOKEN_IDS.MAGIC] },
      // PINKIE_PIE balance
      { address: ADDRESSES.equestria1155, abi: EQUESTRIA_1155_ABI,
        functionName: "balanceOf", args: [address, TOKEN_IDS.PINKIE_PIE] },
      // STARLIGHT balance
      { address: ADDRESSES.equestria1155, abi: EQUESTRIA_1155_ABI,
        functionName: "balanceOf", args: [address, TOKEN_IDS.STARLIGHT_GLIMMER] },
    ] : [],
  });

  const [govBal, govVotes, vaultShares, isRenting, honesty, magic, pinkie, starlight] =
    (data ?? []).map(d => d?.result);

  const QUICK_LINKS = [
    { href: "/craft",     label: "Craft a Pony",      desc: "Burn elements, mint a pony NFT",       color: "text-purple" },
    { href: "/amm",       label: "Swap Tokens",        desc: "Trade on the AMM marketplace",          color: "text-green"  },
    { href: "/vault",     label: "Stake & Earn",       desc: "Deposit GOV tokens, earn yield boost",  color: "text-orange" },
    { href: "/dao",       label: "Vote on Proposals",  desc: "Govern the protocol parameters",        color: "text-accent" },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-white">
              GameFi<span className="text-accent">Economy</span>
            </h1>
            <p className="text-subtext mt-1 font-body">
              ERC-1155 on-chain item economy · craft · trade · govern
            </p>
            {isConnected && address && (
              <p className="text-xs font-mono text-subtext mt-2">
                Connected: <span className="text-accent">{shortenAddress(address)}</span>
              </p>
            )}
          </div>
          {!isConnected && <ConnectButton />}
        </div>
      </div>

      {isConnected ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="GOV Balance"
              value={govBal !== undefined ? formatAmount(govBal as bigint) : "—"}
              sub="GovernanceToken"
              accent
            />
            <StatCard
              label="Voting Power"
              value={govVotes !== undefined ? formatAmount(govVotes as bigint) : "—"}
              sub="Delegated votes"
            />
            <StatCard
              label="Vault Shares"
              value={vaultShares !== undefined ? formatAmount(vaultShares as bigint) : "—"}
              sub={isRenting ? "✦ Boosted" : "No boost"}
            />
            <StatCard
              label="Ponies"
              value={`${pinkie ?? "—"} / ${starlight ?? "—"}`}
              sub="Pinkie / Starlight"
            />
          </div>

          {/* Element balances */}
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-4 text-sm">Elements of Harmony</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: TOKEN_IDS.HONESTY,    name: "Honesty",    bal: honesty,  color: "#58A6FF" },
                { id: TOKEN_IDS.KINDNESS,   name: "Kindness",   bal: undefined, color: "#3FB950" },
                { id: TOKEN_IDS.LAUGHTER,   name: "Laughter",   bal: undefined, color: "#E3B341" },
                { id: TOKEN_IDS.GENEROSITY, name: "Generosity", bal: undefined, color: "#BC8CFF" },
                { id: TOKEN_IDS.LOYALTY,    name: "Loyalty",    bal: undefined, color: "#F85149" },
                { id: TOKEN_IDS.MAGIC,      name: "Magic",      bal: magic,    color: "#BC8CFF" },
              ].map(({ name, bal, color }) => (
                <div key={name}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-surface2 border border-border">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    style={{ background: color + "22", border: `1px solid ${color}44` }}>
                    ✦
                  </div>
                  <span className="text-xs font-mono text-subtext">{name}</span>
                  <span className="font-display font-bold text-white text-sm">
                    {bal !== undefined ? (bal as bigint).toString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_LINKS.map(({ href, label, desc, color }) => (
              <Link key={href} href={href}
                className="card hover:border-accent/40 transition-colors group cursor-pointer">
                <p className={`font-display font-semibold text-sm ${color} group-hover:underline`}>
                  {label} →
                </p>
                <p className="text-subtext text-xs mt-1 font-body">{desc}</p>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <ConnectGuard><></></ConnectGuard>
      )}
    </main>
  );
}
