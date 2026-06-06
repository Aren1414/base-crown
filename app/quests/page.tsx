import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function QuestsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Quests">
          <div className="space-y-3">
            <div>Use 3 Spins</div>
            <div>Perform 2 Attacks</div>
            <div>Claim Daily Reward</div>
          </div>
        </SectionCard>

        <SectionCard title="Social Quests">
          <div className="space-y-3">
            <div>Follow Base</div>
            <div>Share BASE CROWN</div>
            <div>Join Community</div>
          </div>
        </SectionCard>

        <SectionCard title="Rewards">
          <div>Earn CROWN, Fragments and Keys.</div>
        </SectionCard>
      </div>
    </main>
  );
}
