import GameHeader from "@/components/GameHeader";
import ResourceCard from "@/components/ResourceCard";
import SectionCard from "@/components/SectionCard";
import { gameData } from "@/lib/gameData";

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Genesis Crown Key NFT">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="text-xl font-bold">
              Genesis Crown Key
            </div>

            <div className="mt-2 text-sm text-zinc-300">
              Limited to 10,000 NFTs.
            </div>

            <div className="mt-3 text-sm text-zinc-300">
              Price: $1 in ETH
            </div>

            <div className="mt-2 text-sm text-zinc-300">
              Bonus: 20,000 CROWN
            </div>

            <button className="mt-4 w-full rounded-xl bg-blue-600 py-4 font-bold">
              MINT GENESIS NFT
            </button>
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <ResourceCard
            title="CROWN"
            value={gameData.resources.crown}
          />

          <ResourceCard
            title="Fragments"
            value={gameData.resources.fragments}
          />

          <ResourceCard
            title="Keys"
            value={gameData.resources.keys}
          />

          <ResourceCard
            title="Score"
            value={gameData.resources.score}
          />
        </div>

        <SectionCard title="Daily Limits">
          <div className="flex justify-between">
            <span>Spins Remaining</span>

            <span className="font-bold">
              {gameData.daily.spinsRemaining}
            </span>
          </div>

          <div className="flex justify-between mt-2">
            <span>Attacks Remaining</span>

            <span className="font-bold">
              {gameData.daily.attacksRemaining}
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Wallet">
          <div className="font-semibold">
            {gameData.player.connected
              ? gameData.player.wallet
              : "Not Connected"}
          </div>
        </SectionCard>

        <SectionCard title="Season Progress">
          <div className="space-y-2 text-sm">
            <div>
              Level: {gameData.season.level}
            </div>

            <div>
              Rank: {gameData.season.rank ?? "Unranked"}
            </div>

            <div>
              Season Score: {gameData.season.score}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Lifetime Stats">
          <div className="space-y-2 text-sm">
            <div>
              Total Spins: {gameData.stats.totalSpins}
            </div>

            <div>
              Total Attacks: {gameData.stats.totalAttacks}
            </div>

            <div>
              Successful Attacks: {gameData.stats.successfulAttacks}
            </div>

            <div>
              Relics Forged: {gameData.stats.relicsForged}
            </div>

            <div>
              CROWN Earned: {gameData.stats.crownEarned}
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
