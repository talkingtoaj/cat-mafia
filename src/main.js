import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import StreetScene from './scenes/StreetScene.js';
import PatrolScene from './scenes/PatrolScene.js';
import './music.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1423',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, StreetScene, PatrolScene],
};

// Wait for the pixel font so text is crisp on the first frame. Give up after 2s.
const fontReady = document.fonts
  ? Promise.race([
      // Pass Turkish letters so the browser also fetches the latin-ext part of the font.
      document.fonts.load('8px "Press Start 2P"', 'AaÇçĞğİıŞşÖöÜü'),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  : Promise.resolve();

fontReady.finally(() => {
  const game = new Phaser.Game(config);
  if (import.meta.env.DEV) window.game = game; // handy for poking at it from the console
});
