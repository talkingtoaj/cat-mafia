import Phaser from 'phaser';
import { PALETTE } from '../config.js';
import { SHOPS } from '../data/shops.js';

// Loads the art and draws small textures we haven't made art for yet.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.spritesheet('don', 'assets/sprites/don_walk_sheet.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    SHOPS.forEach(({ key }) => this.load.image(`shop-${key}`, `assets/shops/${key}.png`));
    this.load.image('sidewalk', 'assets/tiles/sidewalk.png');
  }

  create() {
    this.makeHeart();
    this.makeSkyline();
    this.makeLamp();

    this.anims.create({
      key: 'don-walk',
      frames: this.anims.generateFrameNumbers('don', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('Street');
  }

  // Draw a texture from rows of characters, one pixel per character.
  pixelTexture(key, rows, colors) {
    const g = this.add.graphics();
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (colors[ch] === undefined) return;
        g.fillStyle(colors[ch]);
        g.fillRect(x, y, 1, 1);
      });
    });
    g.generateTexture(key, rows[0].length, rows.length);
    g.destroy();
  }

  makeHeart() {
    const rows = [
      '.##.##.',
      '#######',
      '#######',
      '.#####.',
      '..###..',
      '...#...',
    ];
    this.pixelTexture('heart', rows, { '#': PALETTE.heart });
    this.pixelTexture('heart-empty', rows, { '#': PALETTE.heartEmpty });
  }

  // Far-off Istanbul: hills, a mosque with two minarets, and Galata Tower.
  makeSkyline() {
    const w = 320;
    const h = 90;
    const g = this.add.graphics();

    g.fillStyle(PALETTE.skylineFar);
    g.fillEllipse(60, h, 200, 70);
    g.fillEllipse(250, h, 220, 60);

    g.fillStyle(PALETTE.skyline);
    // Mosque
    g.fillRect(70, 55, 70, 35);
    g.fillEllipse(105, 55, 44, 34);
    g.fillEllipse(80, 60, 18, 14).fillEllipse(130, 60, 18, 14);
    g.fillRect(104, 32, 2, 6);
    g.fillRect(56, 18, 4, 72).fillTriangle(55, 18, 61, 18, 58, 8);
    g.fillRect(150, 18, 4, 72).fillTriangle(149, 18, 155, 18, 152, 8);
    // Galata Tower
    g.fillRect(230, 40, 14, 50);
    g.fillRect(228, 36, 18, 5);
    g.fillTriangle(227, 36, 247, 36, 237, 20);
    // Rooftops
    g.fillRect(0, 74, 50, 16).fillRect(170, 70, 50, 20).fillRect(260, 72, 60, 18);
    g.generateTexture('skyline', w, h);
    g.destroy();
  }

  makeLamp() {
    const g = this.add.graphics();
    g.fillStyle(0x2a2230);
    g.fillRect(3, 6, 2, 50).fillRect(1, 54, 6, 3).fillRect(1, 2, 6, 5);
    g.fillStyle(0xf7d27a).fillRect(2, 3, 4, 3);
    g.generateTexture('lamp', 8, 57);
    g.destroy();
  }
}
