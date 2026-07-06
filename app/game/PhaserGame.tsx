'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  // Mobile control states
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);
  const [jump, setJump] = useState(false);

  useEffect(() => {
    if (!gameRef.current) return;

    class PrankScene extends Phaser.Scene {
      private runner!: Phaser.Physics.Arcade.Sprite;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private score = 0;
      private scoreText!: Phaser.GameObjects.Text;
      private bananas!: Phaser.Physics.Arcade.Group;

      constructor() {
        super({ key: 'PrankScene' });
      }

      preload() {
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('runner', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('banana', 'https://labs.phaser.io/assets/sprites/banana.png');
      }

      create() {
        this.add.image(400, 300, 'sky');

        const platforms = this.physics.add.staticGroup();
        platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        this.runner = this.physics.add.sprite(100, 450, 'runner');
        this.runner.setBounce(0.2);
        this.runner.setCollideWorldBounds(true);

        this.physics.add.collider(this.runner, platforms);

        this.scoreText = this.add.text(16, 16, 'Score: 0', {
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold'
        });

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.bananas = this.physics.add.group();

        for (let i = 0; i < 8; i++) {
          const x = 150 + Math.random() * 500;
          const banana = this.bananas.create(x, 300 + Math.random() * 200, 'banana');
          banana.setScale(0.6);
        }

        this.physics.add.collider(this.runner, this.bananas, (runner, banana) => {
          this.score += 20;
          this.scoreText.setText('Score: ' + this.score);
          (banana as Phaser.Physics.Arcade.Sprite).destroy();
        });
      }

      update() {
        const body = this.runner.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        this.runner.setVelocityX(0);

        // Keyboard movement
        if (this.cursors.left.isDown) {
          this.runner.setVelocityX(-350);
        } else if (this.cursors.right.isDown) {
          this.runner.setVelocityX(350);
        }

        // Mobile movement
        if (moveLeft) this.runner.setVelocityX(-350);
        if (moveRight) this.runner.setVelocityX(350);

        // Jump (keyboard + mobile)
        if ((this.cursors.space.isDown || jump) && body.touching.down) {
          this.runner.setVelocityY(-700);
        }
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
          gravity: { x: 0, y: 600 },
          debug: false
        }
      },
      scene: PrankScene
    };

    const game = new Phaser.Game(config);

    return () => game.destroy(true);
  }, [moveLeft, moveRight, jump]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-700 p-4 text-center">
        <h1 className="text-3xl font-bold text-white">Prank Squad</h1>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black relative">
        <div className="rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl max-w-full">
          <div ref={gameRef} className="w-full max-w-[800px] aspect-[4/3]" />
        </div>
      </div>

      {/* Professional Mobile Controls */}
      <div className="bg-zinc-900 border-t border-zinc-700 p-6">
        <div className="flex justify-between max-w-[800px] mx-auto">

          {/* Left */}
          <button
            onTouchStart={() => setMoveLeft(true)}
            onTouchEnd={() => setMoveLeft(false)}
            className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-700 active:from-zinc-600 active:to-zinc-500 rounded-3xl flex items-center justify-center text-4xl text-white shadow-xl"
          >
            ←
          </button>

          {/* Jump */}
          <button
            onTouchStart={() => setJump(true)}
            onTouchEnd={() => setJump(false)}
            className="w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-500 active:from-blue-700 active:to-blue-600 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl"
          >
            ↑
          </button>

          {/* Right */}
          <button
            onTouchStart={() => setMoveRight(true)}
            onTouchEnd={() => setMoveRight(false)}
            className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-700 active:from-zinc-600 active:to-zinc-500 rounded-3xl flex items-center justify-center text-4xl text-white shadow-xl"
          >
            →
          </button>

        </div>
      </div>
    </div>
  );
}
