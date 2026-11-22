// Star Catcher entry for make.fun's "The agent builds a game from one prompt"
// bounty (program/v1, Node 22, standard library only).
//
// The entry is the X post itself: an agent built a tiny browser game from
// one prompt, made a short video about it, and posted the video natively
// on X. This program's whole job is to hand the post's address to the
// gate: it reads POST.json from the repository root and writes it to
// /output/POST.json, byte for byte. The house reads the post from X and
// scores it on its views and interactions.
//
// Local check:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const src = join(BOT_DIR, 'POST.json');
const dst = join(OUTPUT_DIR, 'POST.json');

// The gate only accepts a JSON object naming an X post, so fail loudly
// on anything else instead of copying a placeholder through. The rules
// read the address as https://x.com/<handle>/status/<id> (or the same
// on twitter.com), the id digits only, with any query or fragment read
// past — so the id itself must be all digits.
const post = JSON.parse(readFileSync(src, 'utf8')) as { url?: unknown };
const match =
  typeof post.url === 'string'
    ? post.url.match(/^https:\/\/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)(?:[?#].*)?$/)
    : null;
if (!match) {
  console.error(`POST.json does not name an X post: ${JSON.stringify(post)}`);
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(src, dst);
console.log(`POST.json -> ${dst} (${post.url})`);
