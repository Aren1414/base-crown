'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// کنترل‌های مشترک بین React و Phaser
const controls = {
  left: false,
  right: false,
  jump: false,
};

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

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

        // کیبورد
        if (this.cursors.left.isDown) this.runner.setVelocityX(-300);
        if (this.cursors.right.isDown) this.runner.setVelocityX(300);

        // موبایل
        if (controls.left) this.runner.setVelocityX(-300);
        if (controls.right) this.runner.setVelocityX(300);

        if ((this.cursors.space.isDown || controls.jump) && body.touching.down) {
          this.runner.setVelocityY(-650);
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 900,
      height: 600,
      parent: gameRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 600 },
          debug: false,
        },
      },
      scene: GameScene,
    };

    const game = new Phaser.Game(config);

    return () => game.destroy(true);
  }, []);

  // کنترل‌ها
  const press = (key: keyof typeof controls) => (controls[key] = true);
  const release = (key: keyof typeof controls) => (controls[key] = false);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">

      {/* صفحه بازی */}
      <div className="flex-1 flex items-center justify-center p-0">
        <div className="rounded-none overflow-hidden w-full max-w-[900px]">
          <div ref={gameRef} className="w-full aspect-[3/2]" />
        </div>
      </div>

      {/* کنترل‌ها */}
      <div className="bg-zinc-900 border-t border-zinc-700 py-4">
        <div className="flex justify-center gap-10 max-w-[900px] mx-auto">

          {/* چپ */}
          <button
            onTouchStart={() => press('left')}
            onTouchEnd={() => release('left')}
            onMouseDown={() => press('left')}
            onMouseUp={() => release('left')}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl 
                       border border-white/20 text-white text-3xl shadow-xl active:bg-white/20"
          >
            ⬅️
          </button>

          {/* پرش */}
          <button
            onTouchStart={() => press('jump')}
            onTouchEnd={() => release('jump')}
            onMouseDown={() => press('jump')}
            onMouseUp={() => release('jump')}
            className="w-20 h-20 rounded-full bg-blue-600/80 backdrop-blur-xl 
                       border border-blue-300/30 text-white text-4xl shadow-2xl active:bg-blue-700/80"
          >
            ⬆️
          </button>

          {/* راست */}
          <button
            onTouchStart={() => press('right')}
            onTouchEnd={() => release('right')}
            onMouseDown={() => press('right')}
            onMouseUp={() => release('right')}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl 
                       border border-white/20 text-white text-3xl shadow-xl active:bg-white/20"
          >
            ➡️
          </button>

        </div>
      </div>
    </div>
  );
}
