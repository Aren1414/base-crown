'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

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

        this.add.text(50, 50, '← → Move | TAP to Jump', {
          fontSize: '22px',
          color: '#ffffff'
        });
      }

      update() {
        const body = this.runner.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        this.runner.setVelocityX(0);

        if (this.cursors.left.isDown) {
          this.runner.setVelocityX(-350);
        } else if (this.cursors.right.isDown) {
          this.runner.setVelocityX(350);
        }

        if (this.cursors.space.isDown && body.touching.down) {
          this.runner.setVelocityY(-700);
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth > 800 ? 800 : window.innerWidth - 40,
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
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-700 p-4 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Prank Squad</h1>
      </div>

      {/* Game */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <div className="rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl">
          <div ref={gameRef} className="rounded-3xl" />
        </div>
      </div>

      {/* On-Screen Controls */}
      <div className="bg-zinc-900 border-t border-zinc-700 p-6">
        <div className="flex justify-center gap-12 text-white">
          <div className="text-center">
            <div className="text-3xl mb-1">←</div>
            <div className="text-xs text-zinc-400">LEFT</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">→</div>
            <div className="text-xs text-zinc-400">RIGHT</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">↑</div>
            <div className="text-xs text-zinc-400">JUMP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
