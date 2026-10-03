import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SIDEWALK_Y,
  FEET_Y,
  ROAD_Y,
  PANEL_Y,
  FONT,
  PALETTE,
} from '../config.js';
import { SHOPS } from '../data/shops.js';
const MARGIN = 48;
const GAP = 14;
const SHOP_TOP = SIDEWALK_Y - 170; // shop art is 170px tall
const WALK_SPEED = 48; // game pixels per second
const NEAR_SHOP = 34; // how close the Don must be to a shop door to "check in"

export default class StreetScene extends Phaser.Scene {
  constructor() {
    super('Street');
  }

  create() {
    this.drawSky();
    this.add.image(0, SHOP_TOP + 60, 'skyline').setOrigin(0, 1).setScrollFactor(0.3);

    // Shops side by side, with a street lamp in each gap
    let x = MARGIN;
    this.add.image(x - GAP / 2, SIDEWALK_Y + 4, 'lamp').setOrigin(0.5, 1);
    this.shops = SHOPS.map((shop) => {
      const placed = this.placeShop(shop, x);
      x += placed.width + GAP;
      this.add.image(x - GAP / 2, SIDEWALK_Y + 4, 'lamp').setOrigin(0.5, 1);
      return placed;
    });
    const worldW = x - GAP + MARGIN;
    this.worldW = worldW;

    // Sidewalk, curb, road
    this.add.tileSprite(0, SIDEWALK_Y, worldW, ROAD_Y - SIDEWALK_Y, 'sidewalk').setOrigin(0, 0);
    this.add.rectangle(0, ROAD_Y, worldW, 3, PALETTE.cream).setOrigin(0, 0);
    this.add.rectangle(0, ROAD_Y + 3, worldW, PANEL_Y - ROAD_Y - 3, PALETTE.road).setOrigin(0, 0);

    this.don = this.add.sprite(MARGIN / 2 + 10, FEET_Y, 'don', 0).setOrigin(0.5, 56 / 64);
    this.targetX = null;

    this.cameras.main.setBounds(0, 0, worldW, GAME_HEIGHT);
    this.cameras.main.startFollow(this.don, true, 0.12, 0.12);

    this.makePanel();
    this.setupInput();
    this.currentShop = null;
    this.say('Tap the street to walk. Time to make the rounds.');
  }

  drawSky() {
    const g = this.add.graphics().setScrollFactor(0);
    const top = Phaser.Display.Color.IntegerToColor(PALETTE.skyTop);
    const bottom = Phaser.Display.Color.IntegerToColor(PALETTE.skyBottom);
    const bands = 12;
    const bandH = Math.ceil(SIDEWALK_Y / bands);
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
    }
  }

  placeShop(shop, x) {
    // Sink the art 2px so its own pavement edge meets the sidewalk
    const img = this.add.image(x, SIDEWALK_Y + 2, `shop-${shop.key}`).setOrigin(0, 1);
    const { width } = img;

    // Protection hearts above the roof
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      const key = i < shop.hearts ? 'heart' : 'heart-empty';
      hearts.push(this.add.image(x + width / 2 - 10 + i * 10, img.y - img.height - 6, key));
    }

    return { ...shop, width, doorX: x + width * shop.door, hearts };
  }

  makePanel() {
    const h = GAME_HEIGHT - PANEL_Y;
    this.add.rectangle(0, PANEL_Y, GAME_WIDTH, h, PALETTE.night).setOrigin(0, 0).setScrollFactor(0);
    this.add.rectangle(4, PANEL_Y + 4, GAME_WIDTH - 8, h - 8).setOrigin(0, 0).setScrollFactor(0)
      .setStrokeStyle(1, PALETTE.cream);
    this.panelText = this.add
      .text(10, PANEL_Y + 10, '', {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#f2e3c6',
        lineSpacing: 4,
        wordWrap: { width: GAME_WIDTH - 20 },
      })
      .setScrollFactor(0);
  }

  // Typewriter text in the bottom panel.
  say(text) {
    if (this.typing) this.typing.remove();
    this.panelText.setText('');
    let i = 0;
    this.typing = this.time.addEvent({
      delay: 28,
      repeat: text.length - 1,
      callback: () => this.panelText.setText(text.slice(0, ++i)),
    });
  }

  setupInput() {
    const steer = (pointer) => {
      if (pointer.y >= PANEL_Y) return;
      this.targetX = pointer.worldX;
    };
    this.input.on('pointerdown', steer);
    this.input.on('pointermove', (pointer) => pointer.isDown && steer(pointer));

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D');
  }

  update(_time, delta) {
    const { LEFT, RIGHT, A, D } = this.keys;
    let dir = 0;
    if (LEFT.isDown || A.isDown) dir = -1;
    else if (RIGHT.isDown || D.isDown) dir = 1;

    if (dir !== 0) {
      this.targetX = null;
    } else if (this.targetX !== null) {
      const dx = this.targetX - this.don.x;
      if (Math.abs(dx) < 1) this.targetX = null;
      else dir = Math.sign(dx);
    }

    if (dir !== 0) {
      const step = Math.min(WALK_SPEED * (delta / 1000), this.targetX === null ? Infinity : Math.abs(this.targetX - this.don.x));
      this.don.x = Phaser.Math.Clamp(this.don.x + dir * step, 20, this.worldW - 20);
      this.don.setFlipX(dir < 0);
      if (!this.don.anims.isPlaying) this.don.play('don-walk');
    } else if (this.don.anims.isPlaying) {
      this.don.stop();
      this.don.setFrame(0);
    }

    this.checkShops();
  }

  checkShops() {
    const near = this.shops.find((s) => Math.abs(s.doorX - this.don.x) < NEAR_SHOP) || null;
    if (near === this.currentShop) return;
    this.currentShop = near;
    if (near) this.say(near.line);
  }
}
