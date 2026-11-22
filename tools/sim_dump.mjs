// Headless run of Star Catcher: plays the real game with the bot player
// and dumps one snapshot per video frame (30 fps) for the renderer.
// Usage: node tools/sim_dump.mjs <seconds> <out.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const game = require('../game.js');

const seconds = Number(process.argv[2] || 16);
const out = process.argv[3] || 'frames.json';

const g = game.createGame(20261123);
const frames = [];
const totalSteps = Math.round(seconds * 60);
for (let i = 0; i < totalSteps; i++) {
  game.step(g, game.botInput(g));
  if (i % 2 === 0) frames.push(game.snapshot(g)); // 60 Hz -> 30 fps
  if (g.over) break;
}
writeFileSync(out, JSON.stringify(frames));
console.log(`dumped ${frames.length} frames, final score ${g.score}, caught ${g.caught}, missed ${g.missed}, over=${g.over}`);
