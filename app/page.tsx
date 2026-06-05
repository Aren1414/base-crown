export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">BASE CROWN</h1>

          <p className="mt-2 text-zinc-400">
            Fully Onchain Strategy Game on Base
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 p-4">
          <div className="text-sm text-zinc-400">Wallet</div>

          <div className="mt-2 text-lg font-semibold">
            Not Connected
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 p-4">
          <h2 className="font-semibold">Resources</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div>CROWN: 0</div>
            <div>Fragments: 0</div>
            <div>Keys: 0</div>
            <div>Score: 0</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 p-4">
          <h2 className="font-semibold">Daily Limits</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div>Spins Remaining: 5</div>
            <div>Attacks Remaining: 5</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 p-4">
          <h2 className="font-semibold">Genesis Crown Key NFT</h2>

          <div className="mt-2 text-sm text-zinc-400">
            Not Owned
          </div>
        </div>
      </div>
    </main>
  );
}
