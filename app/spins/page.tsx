import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function SpinsPage() {
  return (
    <main className="min-h-screen text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Daily Spins">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Remaining Spins</span>
            <span className="text-2xl font-bold">5 / 5</span>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Spins reset every day.
          </div>
        </SectionCard>

        <SectionCard title="Spin Wheel">
          <button className="w-full rounded-xl bg-yellow-500 py-4 font-bold text-black transition hover:opacity-90">
            SPIN NOW
          </button>

          <div className="mt-3 text-center text-xs text-zinc-500">
            Additional spins can be purchased from the Shop.
          </div>
        </SectionCard>

        <SectionCard title="Genesis Bonus">
          <div className="flex justify-between">
            <span className="text-zinc-400">Genesis Crown Key NFT</span>
            <span className="font-semibold text-red-400">
              Not Owned
            </span>
          </div>

          <div className="mt-3 text-sm text-zinc-500">
            Holders receive +5 extra daily spins.
          </div>
        </SectionCard>

        <SectionCard title="Last Reward">
          <div className="rounded-lg border border-zinc-800 p-3">
            <div className="text-sm text-zinc-500">
              Most Recent Spin
            </div>

            <div className="mt-1 font-semibold">
              No rewards yet
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Possible Rewards">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>10 CROWN</span>
              <span className="text-zinc-500">Common</span>
            </div>

            <div className="flex justify-between">
              <span>50 CROWN</span>
              <span className="text-zinc-500">Common</span>
            </div>

            <div className="flex justify-between">
              <span>100 CROWN</span>
              <span className="text-zinc-500">Uncommon</span>
            </div>

            <div className="flex justify-between">
              <span>250 CROWN</span>
              <span className="text-zinc-500">Rare</span>
            </div>

            <div className="flex justify-between">
              <span>1 Fragment</span>
              <span className="text-zinc-500">Common</span>
            </div>

            <div className="flex justify-between">
              <span>3 Fragments</span>
              <span className="text-zinc-500">Rare</span>
            </div>

            <div className="flex justify-between">
              <span>1 Key</span>
              <span className="text-zinc-500">Epic</span>
            </div>

            <div className="flex justify-between">
              <span>Rare Relic Fragment</span>
              <span className="text-zinc-500">Legendary</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
