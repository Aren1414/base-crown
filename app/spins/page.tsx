export default function SpinsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold">Spins</h1>

        <p className="text-zinc-400 mt-2">
          Use daily spins to earn CROWN, Fragments, Keys and rare rewards.
        </p>

        <div className="mt-6 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-sm">
            Remaining Spins
          </div>

          <div className="text-4xl font-bold mt-2">
            5
          </div>
        </div>

        <button className="w-full mt-4 rounded-xl bg-yellow-500 text-black font-bold py-4">
          SPIN
        </button>

        <div className="mt-6 border border-zinc-800 rounded-xl p-4">
          <div className="font-semibold">
            Last Reward
          </div>

          <div className="text-zinc-400 mt-2">
            No rewards yet.
          </div>
        </div>

        <div className="mt-6 border border-zinc-800 rounded-xl p-4">
          <div className="font-semibold mb-3">
            Reward Pool
          </div>

          <div className="space-y-2 text-sm">
            <div>10 CROWN</div>
            <div>50 CROWN</div>
            <div>100 CROWN</div>
            <div>1 Fragment</div>
            <div>3 Fragments</div>
            <div>1 Key</div>
            <div>Rare Relic Fragment</div>
          </div>
        </div>
      </div>
    </main>
  );
}
