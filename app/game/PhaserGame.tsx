'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  // Mobile control states
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [jump, setJump] = useState(false);

  useEffect(() => {
    if (!gameRef.current) return;

    class GameScene extends Phaser.Scene {
      runner!: Phaser.Physics.Arcade.Sprite;
      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

      preload() {
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('runner', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
      }

      create() {
        this.add.image(450, 300, 'sky');

        const platforms = this.physics.add.staticGroup();
        platforms.create(450, 580, 'ground').setScale(2).refreshBody();

        this.runner = this.physics.add.sprite(100, 450, 'runner');
        this.runner.setBounce(0.2);
        this.runner.setCollideWorldBounds(true);

        this.physics.add.collider(this.runner, platforms);

        this.cursors = this.input.keyboard!.createCursorKeys();
      }

      update() {
        const body = this.runner.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        this.runner.setVelocityX(0);

        // Keyboard movement
        if (this.cursors.left.isDown) this.runner.setVelocityX(-300);
        if (this.cursors.right.isDown) this.runner.setVelocityX(300);

        // Mobile movement
        if (left) this.runner.setVelocityX(-300);
        if (right) this.runner.setVelocityX(300);

        // Jump (keyboard + mobile)
        if ((this.cursors.space.isDown || jump) && body.touching.down) {
          this.runner.setVelocityY(-650);
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 900,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 600 }, 
          debug: false
        }
      },
      scene: GameScene
    };

    const game = new Phaser.Game(config);

    return () => game.destroy(true);
  }, [left, right, jump]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Game */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl">
          <div ref={gameRef} className="w-[900px] h-[600px]" />
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="bg-zinc-900 border-t border-zinc-700 py-6">
        <div className="flex justify-center gap-14">

          {/* Left */}
          <button
            onTouchStart={() => setLeft(true)}
            onTouchEnd={() => setLeft(false)}
            className="w-28 h-28 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-700 
                       active:from-zinc-600 active:to-zinc-500 text-white text-5xl shadow-xl"
          >
            ←
          </button>

          {/* Jump */}
          <button
            onTouchStart={() => setJump(true)}
            onTouchEnd={() => setJump(false)}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 
                       active:from-blue-700 active:to-blue-600 text-white text-6xl shadow-2xl"
          >
            ↑
          </button>

          {/* Right */}
          <button
            onTouchStart={() => setRight(true)}
            onTouchEnd={() => setRight(false)}
            className="w-28 h-28 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-700 
                       active:from-zinc-600 active:to-zinc-500 text-white text-5xl shadow-xl"
          >
            →
          </button>

        </div>
      </div>
    </div>
  );
}
