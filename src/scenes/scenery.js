import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SIDEWALK_Y, ROAD_Y, PANEL_Y, FONT, PALETTE } from '../config.js';

// Pieces of the street that more than one scene draws.

// Dusk sky and the far row of houses. Call first, so shops land on top.
export function drawBackground(scene, width) {
  const g = scene.add.graphics().setScrollFactor(0);
  const top = Phaser.Display.Color.IntegerToColor(PALETTE.skyTop);
  const bottom = Phaser.Display.Color.IntegerToColor(PALETTE.skyBottom);
  const bands = 12;
  const bandH = Math.ceil(SIDEWALK_Y / bands);
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    g.fillRect(0, i * bandH, GAME_WIDTH, bandH);
  }
  // Far houses drift slower than the shops, so the street feels deep.
  scene.add.tileSprite(0, SIDEWALK_Y, width, 224, 'backdrop').setOrigin(0, 1).setScrollFactor(0.6);
}

// Sidewalk (gutter, cobbles and curb are all in the tile), then the road.
export function drawGround(scene, width) {
  scene.add.tileSprite(0, SIDEWALK_Y, width, ROAD_Y - SIDEWALK_Y, 'sidewalk').setOrigin(0, 0);
  scene.add.rectangle(0, ROAD_Y, width, PANEL_Y - ROAD_Y, PALETTE.road).setOrigin(0, 0);
}

// Shop art sits 2px low so its own pavement edge meets the sidewalk.
export function addShop(scene, shop, x) {
  return scene.add.image(x, SIDEWALK_Y + 2, `shop-${shop.key}`).setOrigin(0, 1);
}

// Noir text box at the bottom of the screen with a typewriter `say()`.
export function makePanel(scene) {
  const h = GAME_HEIGHT - PANEL_Y;
  scene.add.rectangle(0, PANEL_Y, GAME_WIDTH, h, PALETTE.night).setOrigin(0, 0).setScrollFactor(0);
  scene.add.rectangle(4, PANEL_Y + 4, GAME_WIDTH - 8, h - 8).setOrigin(0, 0).setScrollFactor(0)
    .setStrokeStyle(1, PALETTE.cream);
  const text = scene.add
    .text(10, PANEL_Y + 10, '', {
      fontFamily: FONT,
      fontSize: '8px',
      color: '#f2e3c6',
      lineSpacing: 4,
      wordWrap: { width: GAME_WIDTH - 20 },
    })
    .setScrollFactor(0);

  let typing = null;
  return (line) => {
    if (typing) typing.remove();
    text.setText('');
    let i = 0;
    typing = scene.time.addEvent({
      delay: 28,
      repeat: line.length - 1,
      callback: () => text.setText(line.slice(0, ++i)),
    });
  };
}
