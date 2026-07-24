'use client';

import dynamic from 'next/dynamic';

const ChaosLane3D = dynamic(() => import('./ChaosLane3D'), {
  ssr: false,
  loading: () => null,
});

export default function GamePage() {
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <ChaosLane3D />
    </div>
  );
}
