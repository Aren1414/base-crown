import GameHeader from "@/components/GameHeader";
import ResourceCard from "@/components/ResourceCard";
import SectionCard from "@/components/SectionCard";
import { gameData } from "@/lib/gameData";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <div className="grid grid-cols-2 gap-3 mt-6">
          <ResourceCard
            title="CROWN"
            value={gameData.crown}
          />

          <ResourceCard
            title="Fragments"
            value={gameData.fragments}
          />

          <ResourceCard
            title="Keys"
            value={gameData.keys}
          />

          <ResourceCard
            title="Score"
            value={gameData.score}
          />
        </div>

        <SectionCard title="Daily Limits">
          <div className="flex justify-between">
            <span>Daily Spins</span>
            <span>{gameData.dailySpins}</span>
          </div>

          <div className="flex justify-between mt-2">
            <span>Daily Attacks</span>
            <span>{gameData.dailyAttacks}</span>
          </div>
        </SectionCard>

        <SectionCard title="Genesis Crown Key NFT">
          <div className="font-semibold">
            {gameData.hasGenesisNFT ? "Owned" : "Not Owned"}
          </div>
        </SectionCard>

        <SectionCard title="Wallet">
          <div className="font-semibold">
            {gameData.walletConnected
              ? "Connected"
              : "Not Connected"}
          </div>
        </SectionCard>

        <SectionCard title="Season">
          <div className="space-y-2 text-sm">
            <div>Season: Alpha</div>
            <div>Rank: Unranked</div>
            <div>Reward Pool: Coming Soon</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
