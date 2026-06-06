import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function AttacksPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Attacks">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              Remaining Attacks
            </span>

            <span className="text-2xl font-bold">
              5 / 5
            </span>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Attacks reset every day.
          </div>
        </SectionCard>

        <SectionCard title="Current Target">
          <div className="rounded-lg border border-zinc-800 p-3">
            <div className="font-semibold">
              Player #3847
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-400">
                Score
              </span>

              <span>
                2,450
              </span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-400">
                Fragments
              </span>

              <span>
                84
              </span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-400">
                Keys
              </span>

              <span>
                3
              </span>
            </div>
          </div>

          <button className="mt-3 w-full rounded-xl border border-zinc-700 py-3 font-semibold">
            FIND NEW TARGET
          </button>
        </SectionCard>

        <SectionCard title="Battle">
          <button className="w-full rounded-xl bg-red-500 py-4 font-bold text-white transition hover:opacity-90">
            ATTACK NOW
          </button>

          <div className="mt-3 text-center text-xs text-zinc-500">
            Successful attacks can steal Fragments and Keys.
          </div>
        </SectionCard>

        <SectionCard title="Possible Loot">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Fragments</span>
              <span className="text-zinc-500">
                Common
              </span>
            </div>

            <div className="flex justify-between">
              <span>Keys</span>
              <span className="text-zinc-500">
                Rare
              </span>
            </div>

            <div className="flex justify-between">
              <span>Score Points</span>
              <span className="text-zinc-500">
                Guaranteed
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Last Battle Result">
          <div className="rounded-lg border border-zinc-800 p-3">
            <div className="text-sm text-zinc-500">
              Most Recent Attack
            </div>

            <div className="mt-1 font-semibold">
              No attacks yet
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
