'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';

const PhaserGame = dynamic(
  () => import('./PhaserGame'),
  { ssr: false }
);

export default function GamePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <PhaserGame />
    </div>
  );
}
