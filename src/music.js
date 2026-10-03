// Background music. A plain <audio> element streams the track, so the game doesn't wait
// for it to download, and it keeps playing when scenes change.
const MUTE_KEY = 'cat-mafia-muted';

const track = new Audio('assets/music/surveying-the-turf.mp3');
track.loop = true;
track.volume = 0.5;
track.preload = 'none';

let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Storage blocked: start with sound on.
}

function play() {
  if (!muted) track.play().catch(() => {});
}

// Browsers only allow sound after the player taps or presses a key.
const unlock = () => {
  play();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Go quiet when the tab is hidden, like when the phone locks.
document.addEventListener('visibilitychange', () => (document.hidden ? track.pause() : play()));

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Fine: the choice just won't be remembered.
  }
  if (muted) track.pause();
  else play();
  return muted;
}
