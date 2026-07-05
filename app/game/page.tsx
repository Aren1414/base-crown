'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PrankSquadGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

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
      scene: {
        preload: function (this: Phaser.Scene) {
          this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
          this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
          this.load.image('runner', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        },
        create: function (this: Phaser.Scene) {
          this.add.image(400, 300, 'sky');
          
          const platforms = this.physics.add.staticGroup();
          platforms.create(400, 568, 'ground').setScale(2).refreshBody();

          const runner = this.physics.add.sprite(100, 450, 'runner');
          runner.setBounce(0.2);
          runner.setCollideWorldBounds(true);

          this.physics.add.collider(runner, platforms);

          this.add.text(100, 50, 'Prank Squad - Tap to Jump!', {
            fontSize: '24px',
            color: '#ffffff'
          });
        },
        update: function () {}
      }
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div ref={gameRef} className="w-[800px] h-[600px]" />
      </div>
    </div>
  );
}
