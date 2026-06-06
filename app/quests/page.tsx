import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function QuestsPage() {
  return (
    <main className="min-h-screen text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Quests">
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="font-semibold">
                Use 3 Spins
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Reward: 50 CROWN
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="font-semibold">
                Perform 2 Attacks
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Reward: 2 Fragments
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="font-semibold">
                Claim Daily Reward
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Reward: 1 Key
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Weekly Quests">
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="font-semibold">
                Complete 25 Spins
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Reward: 500 CROWN
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="font-semibold">
                Complete 15 Attacks
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Reward: 10 Fragments
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Social Quests">
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 p-3">
              Follow Base
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              Share BASE CROWN
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              Join Community
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Quest Rewards">
          <div className="space-y-2 text-sm">
            <div>• CROWN</div>
            <div>• Fragments</div>
            <div>• Keys</div>
            <div>• Seasonal Score</div>
            <div>• Special Achievement Badges</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
