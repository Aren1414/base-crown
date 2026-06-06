import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Season Top Players">
          <div className="space-y-3">
            <div className="flex justify-between rounded-lg border border-zinc-800 p-3">
              <span>#1 Player</span>
              <span>50,000 Score</span>
            </div>

            <div className="flex justify-between rounded-lg border border-zinc-800 p-3">
              <span>#2 Player</span>
              <span>45,000 Score</span>
            </div>

            <div className="flex justify-between rounded-lg border border-zinc-800 p-3">
              <span>#3 Player</span>
              <span>40,000 Score</span>
            </div>

            <div className="flex justify-between rounded-lg border border-zinc-800 p-3">
              <span>#4 Player</span>
              <span>35,000 Score</span>
            </div>

            <div className="flex justify-between rounded-lg border border-zinc-800 p-3">
              <span>#5 Player</span>
              <span>30,000 Score</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Your Ranking">
          <div className="flex justify-between">
            <span className="text-zinc-400">
              Current Rank
            </span>

            <span className="font-bold">
              Unranked
            </span>
          </div>

          <div className="mt-3 flex justify-between">
            <span className="text-zinc-400">
              Score
            </span>

            <span>
              0
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Season Rewards">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Top 1</span>
              <span>Legendary Relic</span>
            </div>

            <div className="flex justify-between">
              <span>Top 10</span>
              <span>10,000 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>Top 100</span>
              <span>2,500 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>Top 1000</span>
              <span>500 CROWN</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Season Information">
          <div className="space-y-2 text-sm">
            <div>Season Duration: 30 Days</div>
            <div>Ranking Based On Score</div>
            <div>Rewards Distributed At Season End</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
