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
    this.load.image('backdrop', 'assets/tiles/backdrop.png');
    ['pigeon', 'mouse', 'gull'].forEach((key) => this.load.image(key, `assets/sprites/${key}.png`));
  }

  create() {
    this.makeHeart();
    this.makeLamp();
    this.makeGoods();

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

  makeLamp() {
    const g = this.add.graphics();
    g.fillStyle(0x2a2230);
    g.fillRect(3, 6, 2, 50).fillRect(1, 54, 6, 3).fillRect(1, 2, 6, 5);
    g.fillStyle(0xf7d27a).fillRect(2, 3, 4, 3);
    g.generateTexture('lamp', 8, 57);
    g.destroy();
  }

  // Things worth stealing, plus the puff a pest leaves when the Don scares it off.
  makeGoods() {
    this.pixelTexture('sugar', [
      '..wwwwww.',
      '.wwwwwwws',
      'wwwwwwwss',
      'wllllllss',
      'wllllllss',
      'wllllllss',
      'wlllllls.',
      '.sssssss.',
    ], { w: 0xfdf8ec, l: 0xe8dfcc, s: 0xb3a892 });
    this.pixelTexture('cheese', [
      '......oyyy.',
      '...oyyyyyyy',
      '.oyyyyyhyyy',
      'yyyyyyyyyyy',
      'yyhyyyyyyhd',
      'yyyyyhyyyyd',
      'yyyyyyyyydd',
      'ddddddddddd',
    ], { y: 0xf5c84c, o: 0xfde08a, h: 0xd99a2b, d: 0xb5762a });
    this.pixelTexture('fish', [
      '...ssss.....',
      '.ssllllss.ks',
      'slellllllskk',
      'slllllllssk.',
      '.sddddddskk.',
      '..ssssss..ks',
    ], { s: 0x5b6f8a, l: 0xc7d3e0, d: 0x9fb0c4, e: 0x1a1423, k: 0x8a9bb3 });
    this.pixelTexture('poof', [
      '...w...',
      '.w...w.',
      '...w...',
      'w.www.w',
      '...w...',
      '.w...w.',
      '...w...',
    ], { w: 0xfdf8ec });
  }
}
