// Star Catcher — a tiny browser game built from one prompt.
// Move the basket, catch the falling stars. 30-second round, 3 lives,
// a golden star is worth 25, a normal star 10. Pure logic below has no
// DOM dependency, so the same code drives the browser game and the
// headless run that renders the video frames.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StarCatcher = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 1920, H = 1080;          // logical playfield, 16:9
  var GROUND_Y = 960;              // basket baseline
  var BASKET_W = 260, BASKET_H = 46;
  var BASKET_SPEED = 1050;         // px per second
  var ROUND_SECONDS = 30;
  var LIVES = 5;
  var DT = 1 / 60;                 // fixed timestep

  // mulberry32 — small deterministic PRNG, seeded so every run plays the same.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createGame(seed) {
    var rand = rng(seed == null ? 20261123 : seed);
    return {
      t: 0, score: 0, lives: LIVES, caught: 0, missed: 0,
      basketX: W / 2, basketV: 0,
      stars: [], spawnIn: 0.4, over: false,
      bgStars: bgStars(rand),
      rand: rand,
    };
  }

  // Twinkling background stars, fixed at game start.
  function bgStars(rand) {
    var out = [], i;
    for (i = 0; i < 130; i++) {
      out.push({
        x: rand() * W, y: rand() * (H - 220),
        r: 1 + rand() * 2.2, phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 1.8,
      });
    }
    return out;
  }

  function spawnStar(g) {
    var golden = g.rand() < 0.12;
    g.stars.push({
      x: 60 + g.rand() * (W - 120),
      y: -30,
      vy: 240 + g.rand() * 120,
      sway: 30 + g.rand() * 50,
      phase: g.rand() * Math.PI * 2,
      golden: golden,
      spin: g.rand() * Math.PI * 2,
    });
  }

  // One fixed step. input: -1 (left), 0, +1 (right). Returns nothing.
  function step(g, input) {
    if (g.over) return;
    g.t += DT;
    var timeLeft = ROUND_SECONDS - g.t;
    if (timeLeft <= 0) { g.over = true; return; }

    // Basket movement, clamped to the playfield.
    g.basketV = input * BASKET_SPEED;
    g.basketX += g.basketV * DT;
    var half = BASKET_W / 2;
    if (g.basketX < half) g.basketX = half;
    if (g.basketX > W - half) g.basketX = W - half;

    // Spawn a new star every ~0.85s, faster as the round goes on.
    g.spawnIn -= DT;
    if (g.spawnIn <= 0) {
      spawnStar(g);
      g.spawnIn = 0.85 - Math.min(0.25, g.t * 0.004);
    }

    // Fall, sway, catch or miss.
    var i, s;
    for (i = g.stars.length - 1; i >= 0; i--) {
      s = g.stars[i];
      s.y += s.vy * DT;
      s.spin += DT * 2.4;
      s.x += Math.sin(g.t * 1.7 + s.phase) * s.sway * DT;
      if (s.y >= GROUND_Y - 10 && s.y <= GROUND_Y + 50 &&
          Math.abs(s.x - g.basketX) < BASKET_W / 2 + 26) {
        g.score += s.golden ? 25 : 10;
        g.caught++;
        g.stars.splice(i, 1);
      } else if (s.y > H + 40) {
        g.stars.splice(i, 1);
        if (!s.golden) {
          g.missed++;
          g.lives--;
          if (g.lives <= 0) g.over = true;
        }
      }
    }
  }

  // A simple bot player: chase the falling star that lands soonest
  // among the ones the basket can still reach in time, and commit to
  // that target until it is caught or gone. Used for the video's
  // gameplay footage, so the footage is the real game playing.
  var botTarget = null;
  function botInput(g) {
    if (botTarget && g.stars.indexOf(botTarget) < 0) botTarget = null;
    if (!botTarget) {
      var bestLand = Infinity, i, s, land, dx;
      for (i = 0; i < g.stars.length; i++) {
        s = g.stars[i];
        land = (GROUND_Y - s.y) / s.vy;
        if (land < 0) continue;
        dx = Math.abs(s.x - g.basketX);
        if (dx > BASKET_SPEED * land + BASKET_W / 2) continue; // unreachable
        if (land < bestLand) { bestLand = land; botTarget = s; }
      }
    }
    if (!botTarget) return 0;
    var d = botTarget.x - g.basketX;
    if (d > 14) return 1;
    if (d < -14) return -1;
    return 0;
  }

  // Snapshot of the frame the renderer needs. Plain data, no functions.
  function snapshot(g) {
    return {
      t: g.t,
      timeLeft: Math.max(0, ROUND_SECONDS - g.t),
      score: g.score, lives: g.lives,
      caught: g.caught, missed: g.missed, over: g.over,
      basketX: g.basketX,
      stars: g.stars.map(function (s) {
        return { x: s.x, y: s.y, golden: s.golden, spin: s.spin };
      }),
      bgStars: g.bgStars,
    };
  }

  // ---- browser rendering (canvas 2d) -------------------------------------
  function drawStar(ctx, x, y, r, rot, color) {
    var i, a;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (i = 0; i < 8; i++) {
      a = (i * Math.PI) / 4;
      var rr = i % 2 === 0 ? r : r * 0.38;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render(ctx, snap) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0820');
    grad.addColorStop(0.6, '#1b1040');
    grad.addColorStop(1, '#3d1a5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Background stars, twinkling.
    var i, b;
    for (i = 0; i < snap.bgStars.length; i++) {
      b = snap.bgStars[i];
      var tw = 0.45 + 0.55 * Math.abs(Math.sin(snap.t * b.speed + b.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Falling stars.
    for (i = 0; i < snap.stars.length; i++) {
      var s = snap.stars[i];
      drawStar(ctx, s.x, s.y, s.golden ? 30 : 24, s.spin,
        s.golden ? '#ffd700' : '#ffe066');
    }

    // Basket.
    var bx = snap.basketX;
    ctx.fillStyle = '#ff4f9a';
    ctx.beginPath();
    ctx.moveTo(bx - BASKET_W / 2, GROUND_Y);
    ctx.lineTo(bx + BASKET_W / 2, GROUND_Y);
    ctx.lineTo(bx + BASKET_W / 2 - 24, GROUND_Y + BASKET_H);
    ctx.lineTo(bx - BASKET_W / 2 + 24, GROUND_Y + BASKET_H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff8fc0';
    ctx.fillRect(bx - BASKET_W / 2, GROUND_Y - 8, BASKET_W, 10);

    // Ground line.
    ctx.fillStyle = '#2a1a4e';
    ctx.fillRect(0, GROUND_Y + BASKET_H, W, H - GROUND_Y - BASKET_H);

    // HUD.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE ' + snap.score, 48, 92);
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(snap.timeLeft) + 's', W / 2, 92);
    ctx.textAlign = 'right';
    var hearts = '';
    for (i = 0; i < LIVES; i++) hearts += i < snap.lives ? '♥ ' : '♡ ';
    ctx.fillText(hearts, W - 48, 92);
    ctx.textAlign = 'left';

    if (snap.over) {
      ctx.fillStyle = 'rgba(10, 8, 32, 0.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(snap.lives > 0 ? 'TIME UP!' : 'GAME OVER', W / 2, H / 2 - 40);
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText('FINAL SCORE ' + snap.score, W / 2, H / 2 + 70);
      ctx.textAlign = 'left';
    }
  }

  // Browser entry point: wires keyboard/mouse and runs the loop.
  function play(canvas) {
    var ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    var g = createGame(20261123);
    var input = 0, keys = {};
    function keyDir() {
      return (keys.ArrowRight || keys.KeyD ? 1 : 0) -
        (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    }
    window.addEventListener('keydown', function (e) {
      keys[e.code] = true; input = keyDir();
      if (['ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false; input = keyDir();
    });
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      g.basketX = ((e.clientX - r.left) / r.width) * W;
    });
    var acc = 0, last = performance.now();
    function frame(now) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= DT) { step(g, input); acc -= DT; }
      render(ctx, snapshot(g));
      if (!g.over) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return g;
  }

  return {
    W: W, H: H, ROUND_SECONDS: ROUND_SECONDS, DT: DT,
    createGame: createGame, step: step, botInput: botInput,
    snapshot: snapshot, render: render, play: play,
  };
});
