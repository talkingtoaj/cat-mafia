import Phaser from 'phaser';
import { GAME_WIDTH, FEET_Y, FONT, PALETTE } from '../config.js';
import { SHOPS } from '../data/shops.js';
import { state, addHearts, save } from '../state.js';
import { drawBackground, drawGround, addShop, makePanel } from './scenery.js';

// Pest Patrol: the Don sits outside a shop and scares off pests before they steal the goods.

const ROUND_MS = 30000;
const GOODS = 3;
const TAP_RADIUS = 20; // generous, so small pests are easy to hit with a thumb
const SPAWN_START = 1500; // ms between pests at the start of the round...
const SPAWN_END = 650; // ...and at the end
const PILE_X = GAME_WIDTH / 2;
const PILE_Y = FEET_Y + 6;
const PILE_SPREAD = 13; // gap between the three goods

const PESTS = {
  pigeon: { speed: 20, flies: false, hop: 2, hopRate: 0.012 },
  mouse: { speed: 34, flies: false, hop: 1, hopRate: 0.03 },
  gull: { speed: 42, flies: true },
};

// How the round ends, by goods kept: [hearts gained, fish paid]
const REWARDS = [[-1, 0], [0, 1], [1, 2], [2, 3]];

export default class PatrolScene extends Phaser.Scene {
  constructor() {
    super('Patrol');
  }

  init({ key }) {
    this.shop = SHOPS.find((s) => s.key === key);
  }

  create() {
    drawBackground(this, GAME_WIDTH);
    const tex = this.textures.get(`shop-${this.shop.key}`).getSourceImage();
    addShop(this, this.shop, Math.round((GAME_WIDTH - tex.width) / 2));
    drawGround(this, GAME_WIDTH);

    this.don = this.add.sprite(PILE_X - 26, FEET_Y - 2, 'don', 0).setOrigin(0.5, 56 / 64);
    this.don.setDepth(this.don.y);

    this.goods = [-PILE_SPREAD, 0, PILE_SPREAD].map((dx) => {
      const home = { x: PILE_X + dx, y: PILE_Y };
      const sprite = this.add.image(home.x, home.y, this.shop.goods).setOrigin(0.5, 1).setDepth(home.y);
      return { sprite, home, status: 'home' };
    });

    this.pests = [];
    this.phase = 'intro';

    this.timerBar = this.add.rectangle(4, 4, GAME_WIDTH - 8, 4, PALETTE.heart).setOrigin(0, 0).setDepth(1000);
    this.add.rectangle(4, 4, GAME_WIDTH - 8, 4).setOrigin(0, 0).setStrokeStyle(1, PALETTE.night).setDepth(1000);
    this.scoreText = this.add.text(GAME_WIDTH - 4, 12, '', { fontFamily: FONT, fontSize: '8px', color: '#f2e3c6' })
      .setOrigin(1, 0).setDepth(1000);

    this.say = makePanel(this);
    this.say(this.shop.intro);
    this.prompt = this.makePrompt('TAP TO START');
    this.input.on('pointerdown', (pointer) => this.onTap(pointer));
  }

  onTap(pointer) {
    if (this.phase === 'intro') return this.startRound();
    if (this.phase === 'done') {
      if (this.time.now > this.doneAt + 600) this.scene.start('Street');
      return;
    }
    const pest = this.pests
      .map((p) => ({ p, d: Phaser.Math.Distance.Between(pointer.x, pointer.y, p.x, this.centerY(p)) }))
      .filter(({ d }) => d < TAP_RADIUS)
      .sort((a, b) => a.d - b.d)[0]?.p;
    if (pest) this.scare(pest);
  }

  startRound() {
    this.phase = 'play';
    this.startedAt = this.time.now;
    this.prompt.destroy();
    this.say('Guard the goods!');
    this.updateScore();
    this.nextSpawn();
  }

  nextSpawn() {
    const t = Math.min(1, (this.time.now - this.startedAt) / ROUND_MS);
    this.spawnTimer = this.time.delayedCall(Phaser.Math.Linear(SPAWN_START, SPAWN_END, t), () => {
      if (this.phase !== 'play') return;
      this.spawn(Phaser.Utils.Array.GetRandom(this.shop.pests));
      this.nextSpawn();
    });
  }

  spawn(kind) {
    const cfg = PESTS[kind];
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side < 0 ? -16 : GAME_WIDTH + 16;
    const y = cfg.flies ? Phaser.Math.Between(30, 110) : Phaser.Math.Between(FEET_Y - 8, FEET_Y + 8);
    const sprite = this.add.image(x, y, kind).setOrigin(0.5, cfg.flies ? 0.5 : 1).setFlipX(side > 0);
    this.pests.push({ kind, cfg, sprite, x, y, side, mode: 'come', item: null, age: 0 });
  }

  centerY(p) {
    return p.cfg.flies ? p.y : p.y - p.sprite.height / 2;
  }

  update(_time, delta) {
    if (this.phase !== 'play') return;

    const elapsed = this.time.now - this.startedAt;
    this.timerBar.width = (GAME_WIDTH - 8) * Math.max(0, 1 - elapsed / ROUND_MS);
    if (elapsed >= ROUND_MS) return this.endRound();

    for (const p of [...this.pests]) this.movePest(p, delta);
    if (this.goods.every((g) => g.status === 'lost')) this.endRound();
  }

  movePest(p, delta) {
    p.age += delta;
    let target;
    if (p.mode === 'come') {
      const item = this.closestGood(p);
      if (!item) {
        p.mode = 'leave';
      } else {
        target = item.home;
        if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 3) return this.grab(p, item);
      }
    }
    if (p.mode !== 'come') {
      // Run back out the way it came; birds also climb.
      target = { x: p.side < 0 ? -24 : GAME_WIDTH + 24, y: p.cfg.flies ? -24 : p.y };
      if (p.x < -20 || p.x > GAME_WIDTH + 20 || p.y < -20) return this.escape(p);
    }

    const speed = p.cfg.speed * (p.mode === 'carry' ? 0.8 : 1) * (delta / 1000);
    const angle = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
    p.x += Math.cos(angle) * speed;
    p.y += Math.sin(angle) * speed;
    p.sprite.setFlipX(Math.cos(angle) < 0);

    // Hop along the ground, or wobble through the air.
    const bob = p.cfg.flies ? 0 : -Math.abs(Math.sin(p.age * p.cfg.hopRate)) * p.cfg.hop;
    p.sprite.setPosition(Math.round(p.x), Math.round(p.y + bob)).setDepth(p.y);
    if (p.cfg.flies) p.sprite.setAngle(Math.sin(p.age * 0.015) * 8);
    if (p.item) p.item.sprite.setPosition(Math.round(p.x), Math.round(p.y + bob + (p.cfg.flies ? 10 : -4))).setDepth(p.y + 1);
  }

  closestGood(p) {
    return this.goods
      .filter((g) => g.status === 'home')
      .sort((a, b) => Math.abs(a.home.x - p.x) - Math.abs(b.home.x - p.x))[0];
  }

  grab(p, item) {
    item.status = 'carried';
    p.item = item;
    p.mode = 'carry';
    this.cameras.main.shake(80, 0.003);
  }

  escape(p) {
    if (p.item) {
      p.item.status = 'lost';
      p.item.sprite.setVisible(false);
      this.updateScore();
    }
    this.removePest(p);
    p.sprite.destroy();
  }

  // byDon is false when time runs out and the pests just scatter.
  scare(p, byDon = true) {
    this.dropItem(p);
    this.removePest(p);
    this.updateScore();

    // Puff of fur and feathers, and the pest bolts off the screen.
    const cy = this.centerY(p);
    const poof = this.add.image(p.x, cy, 'poof').setDepth(999);
    this.tweens.add({ targets: poof, scale: 2, alpha: 0, duration: 300, onComplete: () => poof.destroy() });
    this.tweens.add({
      targets: p.sprite,
      x: p.x + (p.x < PILE_X ? -60 : 60),
      y: cy - 80,
      alpha: 0,
      duration: 450,
      ease: 'Quad.in',
      onComplete: () => p.sprite.destroy(),
    });

    if (!byDon) return;
    // The Don lunges toward the trouble, then settles back.
    this.don.setFlipX(p.x < this.don.x);
    this.tweens.killTweensOf(this.don);
    const homeX = PILE_X - 26;
    this.don.x = homeX;
    this.tweens.add({
      targets: this.don,
      x: homeX + Phaser.Math.Clamp(p.x - homeX, -14, 14),
      duration: 90,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  dropItem(p) {
    if (!p.item) return;
    const item = p.item;
    p.item = null;
    item.status = 'home';
    this.tweens.add({ targets: item.sprite, x: item.home.x, y: item.home.y, duration: 250, ease: 'Bounce.out' });
    item.sprite.setDepth(item.home.y);
  }

  removePest(p) {
    Phaser.Utils.Array.Remove(this.pests, p);
  }

  updateScore() {
    const kept = this.goods.filter((g) => g.status !== 'lost').length;
    this.scoreText.setText(`${kept}/${GOODS}`);
  }

  endRound() {
    this.phase = 'done';
    this.doneAt = this.time.now;
    this.spawnTimer?.remove();
    // When time runs out, every pest still around drops what it has and flees.
    for (const p of [...this.pests]) this.scare(p, false);

    const kept = this.goods.filter((g) => g.status !== 'lost').length;
    const [heartChange, fish] = REWARDS[kept];
    const before = state.hearts[this.shop.key];
    addHearts(this.shop.key, heartChange);
    const hearts = state.hearts[this.shop.key] - before; // what actually changed, after the 0-3 limit
    state.fish += fish;
    save();

    this.say(kept >= 2 ? this.shop.win : this.shop.lose);
    if (fish) this.popup(`+${fish}`, 'fish');
    if (hearts) this.popup(hearts > 0 ? `+${hearts}` : `${hearts}`, hearts > 0 ? 'heart' : 'heart-empty', 14);
    this.time.delayedCall(600, () => this.makePrompt('TAP TO GO BACK'));
  }

  // Blinking hint in a dark box over the shop.
  makePrompt(text) {
    const label = this.add.text(GAME_WIDTH / 2, 150, text, { fontFamily: FONT, fontSize: '8px', color: '#f7d27a' })
      .setOrigin(0.5);
    const box = this.add.rectangle(GAME_WIDTH / 2, 150, label.width + 12, 16, PALETTE.night)
      .setStrokeStyle(1, PALETTE.cream);
    const prompt = this.add.container(0, 0, [box, label]).setDepth(1001);
    this.tweens.add({ targets: label, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
    return prompt;
  }

  // A reward that floats up from the goods pile.
  popup(text, icon, dy = 0) {
    const y = PILE_Y - 64 + dy;
    const img = this.add.image(PILE_X + 14, y, icon).setOrigin(1, 0.5);
    const label = this.add.text(PILE_X + 18, y, text, { fontFamily: FONT, fontSize: '8px', color: '#f2e3c6' })
      .setOrigin(0, 0.5);
    const box = this.add.rectangle(PILE_X + 14 - img.width - 3, y, img.width + label.width + 10, 13, PALETTE.night)
      .setOrigin(0, 0.5);
    const c = this.add.container(0, 0, [box, img, label]).setDepth(1001);
    this.tweens.add({ targets: c, y: -10, duration: 900, ease: 'Quad.out' });
  }
}
