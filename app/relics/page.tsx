import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function RelicsPage() {
  return (
    <main className="min-h-screen text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Relic Collection">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              Total Relics
            </span>

            <span className="text-2xl font-bold">
              0
            </span>
          </div>

          <div className="mt-3 text-sm text-zinc-500">
            Forge Relics to unlock permanent bonuses.
          </div>
        </SectionCard>

        <SectionCard title="Owned Relics">
          <div className="rounded-lg border border-zinc-800 p-4">
            <div className="font-semibold">
              No Relics Forged
            </div>

            <div className="mt-2 text-sm text-zinc-500">
              Collect Fragments and CROWN to forge your first Relic.
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Forge New Relic">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">
                Fragments Required
              </span>

              <span>
                100
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">
                CROWN Required
              </span>

              <span>
                500
              </span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-purple-600 py-4 font-bold text-white transition hover:opacity-90">
            FORGE RELIC
          </button>

          <div className="mt-3 text-center text-xs text-zinc-500">
            Forging burns CROWN and consumes Fragments.
          </div>
        </SectionCard>

        <SectionCard title="Possible Bonuses">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Attack Success Rate</span>
              <span className="text-zinc-500">
                Rare
              </span>
            </div>

            <div className="flex justify-between">
              <span>Spin Rewards</span>
              <span className="text-zinc-500">
                Rare
              </span>
            </div>

            <div className="flex justify-between">
              <span>Fragment Drops</span>
              <span className="text-zinc-500">
                Epic
              </span>
            </div>

            <div className="flex justify-between">
              <span>Extra Daily Attack</span>
              <span className="text-zinc-500">
                Epic
              </span>
            </div>

            <div className="flex justify-between">
              <span>Extra Daily Spin</span>
              <span className="text-zinc-500">
                Legendary
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Relic Progression">
          <div className="space-y-2 text-sm">
            <div>Common Relic</div>
            <div>Rare Relic</div>
            <div>Epic Relic</div>
            <div>Legendary Relic</div>
            <div>Mythic Relic</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
