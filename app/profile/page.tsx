import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Wallet">
          <div className="flex justify-between">
            <span className="text-zinc-400">
              Status
            </span>

            <span className="font-semibold">
              Not Connected
            </span>
          </div>

          <button className="mt-4 w-full rounded-xl bg-white py-4 font-bold text-black">
            CONNECT WALLET
          </button>
        </SectionCard>

        <SectionCard title="Genesis Crown Key NFT">
          <div className="flex justify-between">
            <span className="text-zinc-400">
              Ownership
            </span>

            <span>
              Not Owned
            </span>
          </div>

          <div className="mt-3 text-sm text-zinc-500">
            Holders receive bonus CROWN, extra Spins and extra Attacks.
          </div>
        </SectionCard>

        <SectionCard title="Player Rank">
          <div className="flex justify-between">
            <span className="text-zinc-400">
              Global Rank
            </span>

            <span className="font-bold">
              #
            </span>
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">
              Score
            </span>

            <span className="font-bold">
              0
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Lifetime Statistics">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Spins</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Total Attacks</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Successful Attacks</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>CROWN Earned</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Fragments Collected</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Keys Collected</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Relics Forged</span>
              <span>0</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Season Progress">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Season Level</span>
              <span>1</span>
            </div>

            <div className="flex justify-between">
              <span>Season Score</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span>Season Rewards</span>
              <span>Locked</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Achievements">
          <div className="space-y-2 text-sm text-zinc-400">
            <div>🔒 First Spin</div>
            <div>🔒 First Attack</div>
            <div>🔒 First Relic</div>
            <div>🔒 Top 100 Player</div>
            <div>🔒 Genesis Holder</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
