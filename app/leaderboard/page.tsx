import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Season Ranking">
          <div className="space-y-2">
            <div>#1 Player</div>
            <div>#2 Player</div>
            <div>#3 Player</div>
          </div>
        </SectionCard>

        <SectionCard title="Your Rank">
          <div>Unranked</div>
        </SectionCard>

        <SectionCard title="Season Rewards">
          <div>CROWN and Relic rewards.</div>
        </SectionCard>
      </div>
    </main>
  );
}
