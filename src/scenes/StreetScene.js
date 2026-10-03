import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SIDEWALK_Y, FEET_Y, PANEL_Y, FONT, PALETTE } from '../config.js';
import { SHOPS } from '../data/shops.js';
import { state, addHearts } from '../state.js';
import { isMuted, toggleMute } from '../music.js';
import { drawBackground, drawGround, addShop, makePanel } from './scenery.js';

const MARGIN = 48;
const GAP = 14;
const WALK_SPEED = 48; // game pixels per second
const NEAR_SHOP = 34; // how close the Don must be to a shop door to "check in"
const TROUBLE_EVERY = 45000; // ms between a random shop losing a heart

export default class StreetScene extends Phaser.Scene {
  constructor() {
    super('Street');
  }

  create() {
    const shopWidths = SHOPS.map((s) => this.textures.get(`shop-${s.key}`).getSourceImage().width);
    const worldW = MARGIN * 2 + shopWidths.reduce((a, b) => a + b, 0) + GAP * (SHOPS.length - 1);
    this.worldW = worldW;
    drawBackground(this, worldW);

    // Shops side by side, with a street lamp in each gap
    let x = MARGIN;
    this.add.image(x - GAP / 2, SIDEWALK_Y + 4, 'lamp').setOrigin(0.5, 1);
    this.shops = SHOPS.map((shop) => {
      const placed = this.placeShop(shop, x);
      x += placed.width + GAP;
      this.add.image(x - GAP / 2, SIDEWALK_Y + 4, 'lamp').setOrigin(0.5, 1);
      return placed;
    });

    drawGround(this, worldW);

    const returning = state.donX !== null;
    this.don = this.add.sprite(state.donX ?? MARGIN / 2 + 10, FEET_Y, 'don', 0).setOrigin(0.5, 56 / 64);
    this.targetX = null;

    this.cameras.main.setBounds(0, 0, worldW, GAME_HEIGHT);
    this.cameras.main.startFollow(this.don, true, 0.12, 0.12);

    this.makeFishCounter();
    this.makeMuteButton();
    this.makeGuardButton();
    this.say = makePanel(this);
    this.setupInput();

    this.currentShop = this.findNearShop();
    this.updateGuardButton();
    this.say(returning ? 'Back to the rounds.' : 'Tap the street to walk. At a shop, tap GUARD to chase off pests.');

    // The street never sleeps: now and then a shop starts to doubt you.
    this.time.addEvent({ delay: TROUBLE_EVERY, loop: true, callback: () => this.trouble() });
  }

  placeShop(shop, x) {
    const img = addShop(this, shop, x);
    const { width } = img;
    // Protection hearts above the roof
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(this.add.image(x + width / 2 - 10 + i * 10, img.y - img.height - 6, 'heart'));
    }
    const placed = { ...shop, width, doorX: x + width * shop.door, hearts };
    this.refreshHearts(placed);
    return placed;
  }

  refreshHearts(shop) {
    shop.hearts.forEach((h, i) => h.setTexture(i < state.hearts[shop.key] ? 'heart' : 'heart-empty'));
  }

  trouble() {
    const shaky = this.shops.filter((s) => state.hearts[s.key] > 0);
    if (!shaky.length) return;
    const shop = Phaser.Utils.Array.GetRandom(shaky);
    addHearts(shop.key, -1);
    this.refreshHearts(shop);
    this.cameras.main.shake(150, 0.004);
    this.say(`Word on the street: pests at the ${shop.name}. Better go guard it.`);
  }

  makeFishCounter() {
    this.add.rectangle(4, 4, 44, 13, PALETTE.night, 0.8).setOrigin(0, 0).setScrollFactor(0);
    this.add.image(8, 10, 'fish').setOrigin(0, 0.5).setScrollFactor(0);
    this.add
      .text(23, 7, String(state.fish), { fontFamily: FONT, fontSize: '8px', color: '#f2e3c6' })
      .setScrollFactor(0);
  }

  makeMuteButton() {
    const bg = this.add.rectangle(GAME_WIDTH - 4, 4, 17, 13, PALETTE.night, 0.8).setOrigin(1, 0).setScrollFactor(0);
    const icon = this.add.image(GAME_WIDTH - 12, 10, isMuted() ? 'sound-off' : 'sound-on').setScrollFactor(0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => icon.setTexture(toggleMute() ? 'sound-off' : 'sound-on'));
  }

  // A floating "GUARD" sign over the door the Don is standing at.
  makeGuardButton() {
    const bg = this.add.rectangle(0, 0, 52, 18, PALETTE.night).setStrokeStyle(1, PALETTE.cream);
    const label = this.add.text(0, 0, 'GUARD', { fontFamily: FONT, fontSize: '8px', color: '#f7d27a' })
      .setOrigin(0.5);
    this.guard = this.add.container(0, SIDEWALK_Y - 30, [bg, label]).setSize(52, 18).setVisible(false);
    this.guard.setInteractive({ useHandCursor: true });
    this.guard.on('pointerdown', () => this.startPatrol());
    this.tweens.add({ targets: this.guard, y: '-=3', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  updateGuardButton() {
    const shop = this.currentShop;
    this.guard.setVisible(!!shop);
    if (shop) this.guard.x = shop.doorX;
  }

  startPatrol() {
    state.donX = this.don.x;
    this.scene.start('Patrol', { key: this.currentShop.key });
  }

  setupInput() {
    // Taps on the panel or on a button don't steer.
    const steer = (pointer, over) => {
      if (pointer.y >= PANEL_Y || over.length) return;
      this.targetX = pointer.worldX;
    };
    this.input.on('pointerdown', steer);
    this.input.on('pointermove', (pointer, over) => pointer.isDown && steer(pointer, over));

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE');
    this.keys.SPACE.on('down', () => this.currentShop && this.startPatrol());
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

  findNearShop() {
    return this.shops.find((s) => Math.abs(s.doorX - this.don.x) < NEAR_SHOP) || null;
  }

  checkShops() {
    const near = this.findNearShop();
    if (near === this.currentShop) return;
    this.currentShop = near;
    this.updateGuardButton();
    if (near) this.say(near.line);
  }
}
