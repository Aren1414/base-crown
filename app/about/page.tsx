import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Overview">
          <div>
            Fully onchain strategy game built on Base.
          </div>
        </SectionCard>

        <SectionCard title="Token">
          <div>
            CROWN is the core utility token of the ecosystem.
          </div>
        </SectionCard>

        <SectionCard title="Economy">
          <div>
            Players earn, spend, forge and compete using CROWN.
          </div>
        </SectionCard>

        <SectionCard title="Treasury & Burn">
          <div>
            Part of spending is redirected to treasury and burn mechanisms.
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
