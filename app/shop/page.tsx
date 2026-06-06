import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Genesis Crown Key NFT">
          <div className="rounded-lg border border-zinc-800 p-4">
            <div className="font-semibold">
              Genesis Crown Key
            </div>

            <div className="mt-2 text-sm text-zinc-500">
              Limited to 10,000 NFTs.
            </div>

            <div className="mt-4 flex justify-between">
              <span className="text-zinc-400">
                Price
              </span>

              <span>
                $1 ETH
              </span>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-zinc-400">
                Bonus
              </span>

              <span>
                20,000 CROWN
              </span>
            </div>

            <button className="mt-4 w-full rounded-xl bg-yellow-500 py-4 font-bold text-black">
              MINT NFT
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Extra Spins">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>5 Extra Spins</span>
              <span>0.25$ ETH</span>
            </div>

            <div className="flex justify-between">
              <span>10 Extra Spins</span>
              <span>0.50$ ETH</span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-blue-600 py-4 font-bold">
            BUY SPINS
          </button>
        </SectionCard>

        <SectionCard title="Extra Attacks">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>3 Extra Attacks</span>
              <span>250 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>5 Extra Attacks</span>
              <span>400 CROWN</span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-red-600 py-4 font-bold">
            BUY ATTACKS
          </button>
        </SectionCard>

        <SectionCard title="Key Packs">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>1 Key</span>
              <span>500 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>5 Keys</span>
              <span>2,000 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>10 Keys</span>
              <span>0.75$ ETH</span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-purple-600 py-4 font-bold">
            BUY KEYS
          </button>
        </SectionCard>

        <SectionCard title="Relic Packs">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Common Relic Pack</span>
              <span>1,000 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>Rare Relic Pack</span>
              <span>2,500 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>Epic Relic Pack</span>
              <span>1$ ETH</span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-green-600 py-4 font-bold">
            BUY RELIC PACK
          </button>
        </SectionCard>

        <SectionCard title="Accepted Payments">
          <div className="space-y-2 text-sm">
            <div>• ETH</div>
            <div>• CROWN</div>
            <div>• Some items support both currencies.</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
