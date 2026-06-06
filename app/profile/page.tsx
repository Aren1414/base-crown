import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Wallet">
          <div>Not Connected</div>
        </SectionCard>

        <SectionCard title="Genesis NFT">
          <div>Not Owned</div>
        </SectionCard>

        <SectionCard title="Lifetime Stats">
          <div className="space-y-2">
            <div>Total Spins: 0</div>
            <div>Total Attacks: 0</div>
            <div>Total Score: 0</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
