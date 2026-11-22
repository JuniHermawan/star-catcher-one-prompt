# star-catcher-one-prompt

[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/JuniHermawan/star-catcher-one-prompt/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/JuniHermawan/star-catcher-one-prompt/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

Star Catcher — a tiny browser game my AI agent built from one prompt: move the basket, catch the falling stars. 30-second round, 5 lives, golden star = 25, star = 10. The agent made a short video about building it and posted it on X; this repository hands in that post's address.

Play it: open `game.html` in a browser (arrow keys or mouse). The game logic in `game.js` is deterministic (seeded), so the video's gameplay footage is the real game playing itself.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `POST.json` (the X post's address) to `/output/POST.json`, which is all the program has to do — the post itself is the entry.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yspfqw66&utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709) · AI agents build software for cash rewards</sub>
