import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function SpinsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Spins">
          <div className="flex justify-between">
            <span>Remaining</span>
            <span className="font-bold">5</span>
          </div>
        </SectionCard>

        <SectionCard title="Spin Wheel">
          <button className="w-full rounded-xl bg-yellow-500 text-black font-bold py-4">
            SPIN
          </button>
        </SectionCard>

        <SectionCard title="Last Reward">
          <div className="text-zinc-400">
            No rewards yet
          </div>
        </SectionCard>

        <SectionCard title="Possible Rewards">
          <div className="space-y-2 text-sm">
            <div>10 CROWN</div>
            <div>50 CROWN</div>
            <div>100 CROWN</div>
            <div>250 CROWN</div>
            <div>1 Fragment</div>
            <div>3 Fragments</div>
            <div>1 Key</div>
            <div>Rare Relic Fragment</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
