"use client";
import { useState }  from "react";
import {
  useAccount, useReadContracts, useWriteContract,
  useWaitForTransactionReceipt, useBlockNumber,
} from "wagmi";
import { keccak256, toHex, encodeAbiParameters, parseAbiParameters } from "viem";
import { ADDRESSES, GOVERNOR_ABI, GOVERNANCE_TOKEN_ABI } from "@/lib/contracts";
import { formatAmount, PROPOSAL_STATES, SUPPORT_LABELS } from "@/lib/utils";
import { ConnectGuard, TxButton, Section, StatCard, Badge, InputField, EmptyState } from "@/components/ui";

// Dummy proposals until subgraph is connected
const DUMMY_PROPOSALS = [
  {
    id: "1",
    proposalId: BigInt("94878930239867942609067908413437140521264737858498588285512869797386428660736"),
    description: "Set drop rate for Pinkie Pie to 15% per VRF request",
    state: 1, // Active
    forVotes: 420000n * 10n**18n,
    againstVotes: 50000n * 10n**18n,
    abstainVotes: 10000n * 10n**18n,
    voteEnd: 100n,
  },
  {
    id: "2",
    proposalId: BigInt("2"),
    description: "Increase vault boost BPS from 1200 to 1500",
    state: 4, // Succeeded
    forVotes: 700000n * 10n**18n,
    againstVotes: 20000n * 10n**18n,
    abstainVotes: 5000n * 10n**18n,
    voteEnd: 50n,
  },
  {
    id: "3",
    proposalId: BigInt("3"),
    description: "Deploy new GameToken via Factory with symbol MANA",
    state: 7, // Executed
    forVotes: 600000n * 10n**18n,
    againstVotes: 100000n * 10n**18n,
    abstainVotes: 0n,
    voteEnd: 10n,
  },
];

function stateColor(state: number): "green" | "orange" | "red" | "accent" | "purple" | "default" {
  if (state === 1) return "green";
  if (state === 0) return "orange";
  if (state === 3) return "red";
  if (state === 4 || state === 5) return "accent";
  if (state === 7) return "purple";
  return "default";
}

export default function DAOPage() {
  const { address } = useAccount();
  const [activeProposal, setActiveProposal] = useState<bigint | null>(null);
  const [support, setSupport]               = useState<0 | 1 | 2>(1);
  const [showPropose, setShowPropose]       = useState(false);
  const [propDesc, setPropDesc]             = useState("");
  const [txHash, setTxHash]                 = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data } = useReadContracts({
    contracts: address ? [
      { address: ADDRESSES.governanceToken, abi: GOVERNANCE_TOKEN_ABI, functionName: "balanceOf",  args: [address] },
      { address: ADDRESSES.governanceToken, abi: GOVERNANCE_TOKEN_ABI, functionName: "getVotes",   args: [address] },
      { address: ADDRESSES.governanceToken, abi: GOVERNANCE_TOKEN_ABI, functionName: "delegates",  args: [address] },
      { address: ADDRESSES.myGovernor,      abi: GOVERNOR_ABI,          functionName: "votingDelay"  },
      { address: ADDRESSES.myGovernor,      abi: GOVERNOR_ABI,          functionName: "votingPeriod" },
    ] : [],
  });

  const [govBal, govVotes, delegate, votingDelay, votingPeriod] = (data ?? []).map(d => d?.result);
  const isSelfDelegated = delegate === address;

  async function handleDelegate() {
    if (!address) return;
    try {
      const tx = await writeContractAsync({
        address:      ADDRESSES.governanceToken,
        abi:          GOVERNANCE_TOKEN_ABI,
        functionName: "delegate",
        args:         [address],
      });
      setTxHash(tx);
    } catch {}
  }

  async function handleVote() {
    if (!address || activeProposal === null) return;
    try {
      const tx = await writeContractAsync({
        address:      ADDRESSES.myGovernor,
        abi:          GOVERNOR_ABI,
        functionName: "castVote",
        args:         [activeProposal, support],
      });
      setTxHash(tx);
    } catch {}
  }

  async function handlePropose() {
    if (!address || !propDesc) return;
    try {
      // Dummy no-op proposal targeting Box contract
      const tx = await writeContractAsync({
        address:      ADDRESSES.myGovernor,
        abi:          GOVERNOR_ABI,
        functionName: "propose",
        args: [
          [ADDRESSES.myGovernor],
          [0n],
          ["0x" as `0x${string}`],
          propDesc,
        ],
      });
      setTxHash(tx);
      setShowPropose(false);
      setPropDesc("");
    } catch {}
  }

  const loading = isPending || isConfirming;

  return (
    <ConnectGuard>
      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 animate-fade-in">
        <Section
          title="DAO Governance"
          sub="Vote on protocol parameters · drop rates · crafting costs"
          action={
            <TxButton onClick={() => setShowPropose(s => !s)} variant="ghost">
              {showPropose ? "Cancel" : "+ New Proposal"}
            </TxButton>
          }
        >
          {/* Voting power */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="GOV Balance"    value={govBal !== undefined ? formatAmount(govBal as bigint) : "—"} />
            <StatCard label="Voting Power"   value={govVotes !== undefined ? formatAmount(govVotes as bigint) : "—"} accent />
            <StatCard label="Voting Delay"   value={votingDelay !== undefined ? `${votingDelay} blocks` : "—"} />
            <StatCard label="Voting Period"  value={votingPeriod !== undefined ? `${votingPeriod} blocks` : "—"} />
          </div>

          {/* Delegate prompt */}
          {!isSelfDelegated && (
            <div className="card border-orange/40 bg-orange/5 flex items-center justify-between gap-4">
              <div>
                <p className="text-orange font-display font-semibold text-sm">Delegate your votes</p>
                <p className="text-subtext text-xs font-mono mt-0.5">
                  You must delegate to yourself (or another address) to vote
                </p>
              </div>
              <TxButton onClick={handleDelegate} loading={loading}>
                Self-delegate
              </TxButton>
            </div>
          )}

          {/* New proposal form */}
          {showPropose && (
            <div className="card border-accent/30 flex flex-col gap-4">
              <h3 className="font-display font-semibold text-white text-sm">New Proposal</h3>
              <InputField
                label="Description"
                value={propDesc}
                onChange={setPropDesc}
                placeholder="Describe what this proposal does…"
              />
              <p className="text-subtext text-xs font-mono">
                Note: targets/calldatas are placeholders until contracts are deployed.
              </p>
              <TxButton onClick={handlePropose} loading={loading} disabled={!propDesc}>
                Submit Proposal
              </TxButton>
              {txHash && isSuccess && (
                <p className="text-green text-xs font-mono">✓ Proposal submitted!</p>
              )}
            </div>
          )}

          {/* Proposals list */}
          <div className="flex flex-col gap-3">
            {DUMMY_PROPOSALS.map(prop => {
              const total = prop.forVotes + prop.againstVotes + prop.abstainVotes;
              const forPct = total > 0n ? Number((prop.forVotes * 100n) / total) : 0;
              return (
                <div key={prop.id}
                  className={`card cursor-pointer transition-all hover:border-accent/40 ${
                    activeProposal === prop.proposalId ? "border-accent/60 bg-accent/5" : ""
                  }`}
                  onClick={() => setActiveProposal(
                    activeProposal === prop.proposalId ? null : prop.proposalId
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-body text-sm text-white leading-snug">{prop.description}</p>
                    <Badge color={stateColor(prop.state)}>
                      {PROPOSAL_STATES[prop.state]?.label ?? "Unknown"}
                    </Badge>
                  </div>

                  {/* Vote bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-subtext">
                      <span className="text-green">For {forPct.toFixed(1)}%</span>
                      <span className="text-red">Against {total > 0n ? (100 - forPct).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green rounded-full transition-all"
                        style={{ width: `${forPct}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-subtext">
                      <span>{formatAmount(prop.forVotes)} For</span>
                      <span>{formatAmount(prop.againstVotes)} Against</span>
                      <span>{formatAmount(prop.abstainVotes)} Abstain</span>
                    </div>
                  </div>

                  {/* Vote controls (only for active proposals) */}
                  {activeProposal === prop.proposalId && prop.state === 1 && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {([1, 0, 2] as const).map(s => (
                          <button key={s} onClick={() => setSupport(s)}
                            className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors ${
                              support === s
                                ? s === 1 ? "border-green/40 bg-green/10 text-green"
                                  : s === 0 ? "border-red/40 bg-red/10 text-red"
                                  : "border-subtext/40 bg-surface2 text-subtext"
                                : "border-border text-subtext hover:text-text"
                            }`}
                          >
                            {SUPPORT_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      {isSuccess && txHash ? (
                        <p className="text-green text-xs font-mono text-center">✓ Vote cast!</p>
                      ) : (
                        <TxButton onClick={handleVote} loading={loading} disabled={!isSelfDelegated}>
                          {isSelfDelegated ? `Vote ${SUPPORT_LABELS[support]}` : "Delegate first to vote"}
                        </TxButton>
                      )}
                      {txHash && (
                        <p className="text-xs font-mono text-subtext break-all">
                          Tx: <span className="text-accent">{txHash}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </main>
    </ConnectGuard>
  );
}
