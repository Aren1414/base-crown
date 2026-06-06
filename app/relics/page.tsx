import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function RelicsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Owned Relics">
          <div>No relics forged</div>
        </SectionCard>

        <SectionCard title="Forge Relic">
          <div className="space-y-2 text-sm">
            <div>Cost: 100 Fragments</div>
            <div>Cost: 500 CROWN</div>
          </div>

          <button className="w-full mt-4 rounded-xl bg-purple-600 py-4 font-bold">
            FORGE
          </button>
        </SectionCard>

        <SectionCard title="Relic Bonuses">
          <div className="space-y-2 text-sm">
            <div>+ Attack Power</div>
            <div>+ Spin Rewards</div>
            <div>+ Fragment Drops</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
