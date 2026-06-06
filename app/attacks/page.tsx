import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function AttacksPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Attacks">
          <div className="flex justify-between">
            <span>Remaining</span>
            <span className="font-bold">5</span>
          </div>
        </SectionCard>

        <SectionCard title="Target">
          <div className="space-y-2">
            <div>Player #0000</div>
            <div className="text-zinc-400 text-sm">
              Score: 0
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Battle">
          <button className="w-full rounded-xl bg-red-500 py-4 font-bold">
            ATTACK
          </button>
        </SectionCard>

        <SectionCard title="Last Result">
          <div className="text-zinc-400">
            No attacks yet
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
