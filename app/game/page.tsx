'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function GamePage() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 300 }, debug: false }
      },
      scene: {
        preload: function() {
          this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
          this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        },
        create: function() {
          this.add.image(400, 300, 'sky');
          const ground = this.physics.add.staticGroup();
          ground.create(400, 568, 'ground').setScale(2).refreshBody();
        },
        update: function() {}
      }
    };

    const game = new Phaser.Game(config);

    return () => game.destroy(true);
  }, []);

  return <div ref={gameRef} className="w-full h-screen bg-black" />;
}
