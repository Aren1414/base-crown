import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function ShopPage() {
  return (
    <main className="min-h-screen p-4 text-white">
      <div className="max-w-md mx-auto pb-24">
        <GameHeader />

        <SectionCard title="Extra Spins">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>5 Extra Spins</span>
              <span>100 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>10 Extra Spins</span>
              <span>180 CROWN</span>
            </div>

            <div className="flex justify-between">
              <span>25 Extra Spins</span>
              <span>400 CROWN</span>
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

            <div className="flex justify-between">
              <span>10 Extra Attacks</span>
              <span>700 CROWN</span>
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
              <span>3,500 CROWN</span>
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
              <span>5,000 CROWN</span>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-green-600 py-4 font-bold">
            BUY RELIC PACK
          </button>
        </SectionCard>

        <SectionCard title="Coming Soon">
          <div className="space-y-2 text-sm text-zinc-300">
            <div>• Seasonal Boosters</div>
            <div>• Guild Upgrades</div>
            <div>• Legendary Relics</div>
            <div>• Special Event Packs</div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
