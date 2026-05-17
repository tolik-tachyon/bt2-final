"use client";
import { useState }                         from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, EQUESTRIA_1155_ABI, TOKEN_IDS, PONY_RECIPES, ELEMENT_NAMES } from "@/lib/contracts";
import { ConnectGuard, TxButton, Section, Badge } from "@/components/ui";

const PONIES = [
  { id: TOKEN_IDS.PINKIE_PIE,        name: "Pinkie Pie",        emoji: "🎉" },
  { id: TOKEN_IDS.STARLIGHT_GLIMMER, name: "Starlight Glimmer", emoji: "✨" },
];

const ELEMENT_COLORS: Record<string, string> = {
  "1": "text-accent",  "2": "text-green",  "3": "text-orange",
  "4": "text-purple",  "5": "text-red",    "6": "text-purple",
};

export default function CraftPage() {
  const { address } = useAccount();
  const [selected, setSelected] = useState<bigint>(TOKEN_IDS.PINKIE_PIE);

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Read all element balances
  const { data: balances } = useReadContracts({
    contracts: address ? [1n,2n,3n,4n,5n,6n].map(id => ({
      address: ADDRESSES.equestria1155,
      abi:     EQUESTRIA_1155_ABI,
      functionName: "balanceOf" as const,
      args:    [address, id],
    })) : [],
  });

  const balMap: Record<string, bigint> = {};
  if (balances) {
    [1n,2n,3n,4n,5n,6n].forEach((id, i) => {
      balMap[id.toString()] = (balances[i]?.result as bigint) ?? 0n;
    });
  }

  const recipe = PONY_RECIPES[selected.toString()];
  const canCraft = recipe && Object.entries(recipe).every(
    ([id, needed]) => (balMap[id] ?? 0n) >= BigInt(needed)
  );

  function handleCraft() {
    writeContract({
      address:      ADDRESSES.equestria1155,
      abi:          EQUESTRIA_1155_ABI,
      functionName: "craft",
      args:         [selected],
    });
  }

  return (
    <ConnectGuard>
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6 animate-fade-in">
        <Section
          title="Crafting Workshop"
          sub="Burn Elements of Harmony to mint a pony NFT"
        >
          {/* Pony selector */}
          <div className="grid grid-cols-2 gap-3">
            {PONIES.map(({ id, name, emoji }) => (
              <button
                key={id.toString()}
                onClick={() => { setSelected(id); reset(); }}
                className={`card text-left transition-all ${
                  selected === id
                    ? "border-accent/60 bg-accent/5"
                    : "hover:border-border/80"
                }`}
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="font-display font-semibold text-white text-sm">{name}</p>
                <p className="text-subtext text-xs font-mono mt-0.5">ID #{id.toString()}</p>
              </button>
            ))}
          </div>

          {/* Recipe */}
          <div className="card">
            <h3 className="font-display font-semibold text-white text-sm mb-3">
              Recipe — {ELEMENT_NAMES[selected.toString()]}
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(recipe).filter(([, v]) => v > 0).map(([id, needed]) => {
                const have    = balMap[id] ?? 0n;
                const enough  = have >= BigInt(needed);
                return (
                  <div key={id} className="flex items-center justify-between">
                    <span className={`text-sm font-mono ${ELEMENT_COLORS[id]}`}>
                      {ELEMENT_NAMES[id]}
                    </span>
                    <span className={`text-sm font-mono ${enough ? "text-green" : "text-red"}`}>
                      {have.toString()} / {needed}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action */}
          <div className="flex flex-col gap-3">
            {isSuccess ? (
              <div className="card border-green/40 bg-green/5 text-green font-mono text-sm text-center">
                ✓ Craft successful! Check your inventory.
              </div>
            ) : (
              <TxButton
                onClick={handleCraft}
                loading={isPending || isConfirming}
                disabled={!canCraft}
              >
                {isPending ? "Confirm in wallet…" : isConfirming ? "Minting…" : canCraft ? `Craft ${ELEMENT_NAMES[selected.toString()]}` : "Insufficient elements"}
              </TxButton>
            )}
            {!canCraft && (
              <p className="text-subtext text-xs font-mono text-center">
                You need more elements to craft this pony
              </p>
            )}
            {txHash && (
              <p className="text-xs font-mono text-subtext text-center break-all">
                Tx: <span className="text-accent">{txHash}</span>
              </p>
            )}
          </div>
        </Section>
      </main>
    </ConnectGuard>
  );
}
