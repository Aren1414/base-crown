import GameHeader from "@/components/GameHeader";
import SectionCard from "@/components/SectionCard";

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <GameHeader />

        <SectionCard title="Genesis Crown Key NFT">
          <div>Price: $1 in ETH</div>
        </SectionCard>

        <SectionCard title="Extra Spins">
          <div>Buy additional daily spins.</div>
        </SectionCard>

        <SectionCard title="Extra Attacks">
          <div>Buy additional daily attacks.</div>
        </SectionCard>

        <SectionCard title="Keys">
          <div>Unlock special rewards and relics.</div>
        </SectionCard>
      </div>
    </main>
  );
}
