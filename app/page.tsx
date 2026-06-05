export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center">
          BASE CROWN
        </h1>

        <p className="text-center text-zinc-400 mt-2">
          Fully Onchain Strategy Game
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs">CROWN</div>
            <div className="text-xl font-bold">0</div>
          </div>

          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs">Fragments</div>
            <div className="text-xl font-bold">0</div>
          </div>

          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs">Keys</div>
            <div className="text-xl font-bold">0</div>
          </div>

          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs">Score</div>
            <div className="text-xl font-bold">0</div>
          </div>
        </div>

        <div className="mt-4 border border-zinc-800 rounded-xl p-4">
          <div className="flex justify-between">
            <span>Daily Spins</span>
            <span>5</span>
          </div>

          <div className="flex justify-between mt-2">
            <span>Daily Attacks</span>
            <span>5</span>
          </div>
        </div>

        <div className="mt-4 border border-zinc-800 rounded-xl p-4">
          <div className="text-sm text-zinc-500">
            Genesis Crown Key NFT
          </div>

          <div className="mt-2 font-semibold">
            Not Owned
          </div>
        </div>

        <div className="mt-4 border border-zinc-800 rounded-xl p-4">
          <div className="text-sm text-zinc-500">
            Wallet
          </div>

          <div className="mt-2 font-semibold">
            Not Connected
          </div>
        </div>
      </div>
    </main>
  );
}
