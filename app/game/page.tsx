'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PrankSquadGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    class PrankScene extends Phaser.Scene {
      constructor() {
        super({ key: 'PrankScene' });
      }

      preload() {
        this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('runner', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
      }

      create() {
        this.add.image(400, 300, 'background');
        
        const runner = this.physics.add.sprite(100, 450, 'runner');
        runner.setBounce(0.2);
        runner.setCollideWorldBounds(true);

        this.add.text(100, 50, 'Prank Squad - Tap to Jump & Prank!', {
          fontSize: '20px',
          color: '#fff'
        });
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300 },
          debug: false
        }
      },
      scene: PrankScene
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div ref={gameRef} className="border border-gray-700 rounded-lg overflow-hidden" />
    </div>
  );
}
