// 미니게임 5종 (2D 캔버스 화면)
//  침실: 납치범 잡기 / 거실: 과녁 맞추기 / 화장실: 순서 기억하기 / 부엌: 계란 뒤집기 / 1층: W를 가져가 리듬
(function () {
  const C = G.CONFIG, U = G.U;
  const CW = 900, CH = 560;

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function text(ctx, s, x, y, size, color) {
    ctx.font = `bold ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = color || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function outlined(ctx, s, x, y, size, color) {
    ctx.font = `bold ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, size / 8); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
  }

  function drawKwon(ctx, x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.squash) ctx.scale(1 + o.squash * 0.25, 1 - o.squash * 0.35);
    ctx.fillStyle = '#ffd2a6'; circle(ctx, 0, 0, r); ctx.fill();
    ctx.fillStyle = '#2b1a10';
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.lineTo(r, -r * 0.25);
    ctx.quadraticCurveTo(0, -r * 0.55, -r, -r * 0.25); ctx.closePath(); ctx.fill();
    // 옆머리
    ctx.fillRect(-r * 1.02, -r * 0.3, r * 0.22, r * 0.75); ctx.fillRect(r * 0.8, -r * 0.3, r * 0.22, r * 0.75);
    // 하얀 가면
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.74, r * 0.76, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7b3fe4'; ctx.fillRect(-r * 0.45, -r * 0.24, r * 0.9, r * 0.08);
    if (o.dizzy) {
      ctx.strokeStyle = '#111'; ctx.lineWidth = r * 0.09;
      [-0.32, 0.32].forEach((ex) => {
        ctx.beginPath(); ctx.moveTo((ex - 0.13) * r, -0.02 * r); ctx.lineTo((ex + 0.13) * r, 0.22 * r);
        ctx.moveTo((ex + 0.13) * r, -0.02 * r); ctx.lineTo((ex - 0.13) * r, 0.22 * r); ctx.stroke();
      });
    } else {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-0.32 * r, 0.1 * r, 0.2 * r, 0.12 * r, -0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.32 * r, 0.1 * r, 0.2 * r, 0.12 * r, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ellipse(ctx, -0.3 * r, 0.11 * r, 0.05 * r, 0.05 * r); ellipse(ctx, 0.3 * r, 0.11 * r, 0.05 * r, 0.05 * r);
    }
    ctx.strokeStyle = '#111'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0.32 * r, 0.32 * r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }

  // 비비탄 권총 (옆모습, 총구 앞 주황색 안전팁)
  function drawPistol(ctx, mouse, recoil) {
    const gx = 650 + (mouse.x - 450) * 0.2, gy = 525;
    const a = Math.atan2(mouse.y - gy, mouse.x - gx);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(a);
    if (Math.cos(a) < 0) ctx.scale(1, -1);          // 왼쪽을 겨눠도 손잡이는 아래로
    ctx.translate(-recoil * 16, 0);
    ctx.scale(1.15, 1.15);
    ctx.lineJoin = 'round';

    // 손잡이 (체크무늬 그립)
    ctx.fillStyle = '#1f2125';
    ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(18, 4); ctx.lineTo(8, 96); ctx.lineTo(-52, 96); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#3d2b22';
    ctx.beginPath(); ctx.moveTo(-28, 14); ctx.lineTo(8, 14); ctx.lineTo(0, 84); ctx.lineTo(-44, 84); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    for (let i = -80; i < 80; i += 7) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 100, 100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 100, 0); ctx.lineTo(i, 100); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#111'; U.roundRect(ctx, -56, 92, 68, 10, 3); ctx.fill();            // 탄창 바닥

    // 프레임 + 방아쇠울 + 방아쇠
    ctx.fillStyle = '#2a2d33'; U.roundRect(ctx, -36, -6, 160, 16, 4); ctx.fill();
    ctx.fillStyle = '#1b1d21'; for (let x = 70; x < 118; x += 9) ctx.fillRect(x, 6, 5, 4);  // 레일
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(18, 8); ctx.quadraticCurveTo(20, 44, 52, 40); ctx.quadraticCurveTo(70, 36, 68, 8); ctx.stroke();
    ctx.strokeStyle = '#0f1012'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(40, 10); ctx.quadraticCurveTo(46, 22, 40, 32); ctx.stroke();

    // 슬라이드 (금속 광택)
    const g = ctx.createLinearGradient(0, -38, 0, -4);
    g.addColorStop(0, '#6b7280'); g.addColorStop(0.25, '#3f444c'); g.addColorStop(1, '#1c1f24');
    ctx.fillStyle = g; U.roundRect(ctx, -44, -38, 196, 34, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-38, -35); ctx.lineTo(146, -35); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
    for (let x = -36; x < -6; x += 5) { ctx.beginPath(); ctx.moveTo(x, -32); ctx.lineTo(x, -10); ctx.stroke(); } // 톱니
    ctx.fillStyle = '#0d0e10'; ctx.fillRect(40, -34, 34, 9);                             // 배출구
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(84, -18, 40, 2); ctx.fillRect(84, -14, 28, 2);            // 각인
    ctx.fillStyle = '#111'; ctx.fillRect(-42, -44, 12, 7); ctx.fillRect(136, -44, 7, 7); // 가늠자·가늠쇠
    ctx.fillStyle = '#ef4444'; ctx.fillRect(138, -43, 3, 3);
    ctx.fillStyle = '#26292e'; U.roundRect(ctx, -54, -30, 14, 16, 4); ctx.fill();        // 공이치기

    // 주황색 안전 팁 + 총구
    ctx.fillStyle = '#ff7a1a'; U.roundRect(ctx, 150, -36, 16, 30, 3); ctx.fill();
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(163, -24, 4, 6);

    // 발사 불꽃
    if (recoil > 0.55) {
      const fg = ctx.createRadialGradient(182, -21, 2, 182, -21, 30);
      fg.addColorStop(0, 'rgba(255,255,220,1)'); fg.addColorStop(0.4, 'rgba(255,190,60,0.9)'); fg.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 10 : 30, an = i / 10 * Math.PI * 2; ctx.lineTo(182 + Math.cos(an) * r * 1.3, -21 + Math.sin(an) * r); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------
  const DEFS = {
    // 1) 납치범 잡기 (두더지 잡기)
    whack: {
      title: '🔨 납치범 잡기', color: 0xef4444, cursor: 'none',
      intro: ['구멍에서 튀어나오는 납치범의 머리를', '뿅망치로 내려쳐라! (마우스 클릭)'],
      goal: (c) => `${c.time}초 안에 ${c.goal}마리 이상 잡기!`,
      bg(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, CH);
        g.addColorStop(0, '#7dd3fc'); g.addColorStop(0.22, '#86efac'); g.addColorStop(1, '#15803d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      },
      create(ctx, cfg, finish, info) {
        const holes = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) holes.push({ x: 210 + c * 240, y: 210 + r * 135, state: 'down', t: 0, dur: 0, pop: 0 });
        let time = cfg.time, score = 0, spawnT = 0.5, swing = 0;
        const mouse = { x: CW / 2, y: CH / 2 }, pops = [];
        const headY = (h) => h.y + 50 - h.pop * 100;
        return {
          update(dt) {
            time -= dt;
            const prog = U.clamp(1 - time / cfg.time, 0, 1);
            spawnT -= dt;
            if (spawnT <= 0) {
              const free = holes.filter((h) => h.state === 'down');
              if (free.length && holes.length - free.length < 3) {
                const h = U.pick(free); h.state = 'up'; h.t = 0; h.dur = U.rand(0.8, 1.2) * (1 - prog * 0.35);
              }
              spawnT = U.lerp(0.8, 0.4, prog) * U.rand(0.8, 1.2);
            }
            holes.forEach((h) => {
              if (h.state === 'down') return;
              h.t += dt;
              if (h.state === 'up') {
                h.pop = h.t < 0.12 ? h.t / 0.12 : h.t > h.dur - 0.12 ? Math.max(0, (h.dur - h.t) / 0.12) : 1;
                if (h.t >= h.dur) { h.state = 'down'; h.pop = 0; }
              } else {
                h.pop = Math.max(0, 1 - Math.max(0, h.t - 0.15) / 0.2);
                if (h.t >= 0.35) { h.state = 'down'; h.pop = 0; }
              }
            });
            swing = Math.max(0, swing - dt * 7);
            for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.6) pops.splice(i, 1); }
            info(`⏱ <b>${Math.max(0, Math.ceil(time))}</b>초 &nbsp; 🔨 <b>${score}</b> / ${cfg.goal}마리`);
            if (time <= 0) finish(score >= cfg.goal, `잡은 납치범: ${score}마리 (목표 ${cfg.goal}마리)`);
          },
          draw() {
            DEFS.whack.bg(ctx);
            holes.forEach((h) => {
              ctx.fillStyle = '#3b2412'; ellipse(ctx, h.x, h.y, 82, 26);
              if (h.pop > 0) {
                ctx.save();
                ctx.beginPath(); ctx.rect(h.x - 110, h.y - 220, 220, 220); ctx.clip();
                const hy = headY(h);
                ctx.fillStyle = '#7b3fe4'; U.roundRect(ctx, h.x - 45, hy + 36, 90, 80, 20); ctx.fill();
                drawKwon(ctx, h.x, hy, 48, { dizzy: h.state === 'hit', squash: h.state === 'hit' ? 1 : 0 });
                if (h.state === 'hit') text(ctx, '💫', h.x, hy - 58, 34);
                ctx.restore();
              }
              ctx.fillStyle = '#5b3a1e';
              ctx.beginPath(); ctx.ellipse(h.x, h.y, 82, 26, 0, 0, Math.PI); ctx.fill();
            });
            pops.forEach((p) => outlined(ctx, '뿅!', p.x, p.y - p.t * 60, 40, '#ffd23f'));
            ctx.save(); ctx.translate(mouse.x, mouse.y); ctx.rotate(0.6 - swing * 0.9);
            ctx.fillStyle = '#facc15'; ctx.fillRect(-8, 18, 16, 110);
            ctx.fillStyle = '#ef4444'; U.roundRect(ctx, -55, -30, 110, 60, 22); ctx.fill();
            ctx.fillStyle = '#fde047'; U.roundRect(ctx, -55, -30, 22, 60, 10); ctx.fill(); U.roundRect(ctx, 33, -30, 22, 60, 10); ctx.fill();
            ctx.restore();
          },
          onPointerMove(x, y) { mouse.x = x; mouse.y = y; },
          onPointerDown(x, y) {
            mouse.x = x; mouse.y = y; swing = 1;
            for (const h of holes) {
              if (h.state !== 'up' || h.pop < 0.35) continue;
              const hy = headY(h);
              if (Math.hypot(x - h.x, y - hy) < 62 && y < h.y + 20) {
                h.state = 'hit'; h.t = 0; score++;
                pops.push({ x: h.x, y: hy - 60, t: 0 });
                G.Audio.play('hit');
                if (score >= cfg.goal) finish(true, `납치범 ${score}마리 잡기 성공!`);
                return;
              }
            }
            G.Audio.play('click');
          },
        };
      },
    },

    // 2) 과녁 맞추기
    target: {
      title: '🎯 과녁 맞추기', color: 0xf59e0b, cursor: 'none',
      intro: ['장난감 총으로 움직이는 과녁을 맞춰라! (마우스 클릭)', '가운데일수록 점수가 높아요: 노랑 10 · 빨강 5 · 바깥 2'],
      goal: (c) => `${c.time}초 안에 ${c.goal}점 이상!`,
      bg(ctx) {
        ctx.fillStyle = '#5b2a12'; ctx.fillRect(0, 0, CW, CH);
        for (let x = 0; x < CW; x += 60) { ctx.fillStyle = (x / 60) % 2 ? '#6b3417' : '#5b2a12'; ctx.fillRect(x, 0, 60, CH); }
        const cols = ['#ef4444', '#facc15', '#3b82f6', '#22c55e'];
        for (let x = 0; x < CW; x += 50) { ctx.fillStyle = cols[(x / 50) % 4]; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 25, 40); ctx.fill(); }
        ctx.fillStyle = '#a16207'; ctx.fillRect(0, 470, CW, 90);
        ctx.fillStyle = '#ca8a04'; ctx.fillRect(0, 470, CW, 12);
      },
      create(ctx, cfg, finish, info) {
        let time = cfg.time, score = 0, spawnT = 0.2, recoil = 0;
        const mouse = { x: CW / 2, y: CH / 2 }, targets = [], pops = [];
        return {
          update(dt) {
            time -= dt; spawnT -= dt;
            if (spawnT <= 0 && targets.length < 3) {
              const r = U.rand(46, 62);
              targets.push({ x: U.rand(r + 20, CW - r - 20), y: U.rand(120, 380), vx: U.pick([-1, 1]) * U.rand(60, 170), vy: U.rand(-30, 30), r, life: 0, max: U.rand(2.0, 2.8) });
              spawnT = U.rand(0.4, 0.75);
            }
            for (let i = targets.length - 1; i >= 0; i--) {
              const t = targets[i];
              t.life += dt; t.x += t.vx * dt; t.y += t.vy * dt;
              if (t.x < t.r || t.x > CW - t.r) { t.vx *= -1; t.x = U.clamp(t.x, t.r, CW - t.r); }
              if (t.y < 100 || t.y > 400) { t.vy *= -1; t.y = U.clamp(t.y, 100, 400); }
              if (t.life > t.max) targets.splice(i, 1);
            }
            recoil = Math.max(0, recoil - dt * 6);
            for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.7) pops.splice(i, 1); }
            info(`⏱ <b>${Math.max(0, Math.ceil(time))}</b>초 &nbsp; 🎯 <b>${score}</b> / ${cfg.goal}점`);
            if (time <= 0) finish(score >= cfg.goal, `점수: ${score}점 (목표 ${cfg.goal}점)`);
          },
          draw() {
            DEFS.target.bg(ctx);
            targets.forEach((t) => {
              const s = t.life < 0.15 ? t.life / 0.15 : t.life > t.max - 0.25 ? Math.max(0, (t.max - t.life) / 0.25) : 1;
              ctx.fillStyle = '#d6d3d1'; ctx.fillRect(t.x - 4, t.y, 8, 470 - t.y);
              ctx.save(); ctx.translate(t.x, t.y); ctx.scale(s, s);
              [[1, '#ef4444'], [0.78, '#fff'], [0.55, '#ef4444'], [0.25, '#facc15']].forEach(([k, c]) => { ctx.fillStyle = c; circle(ctx, 0, 0, t.r * k); ctx.fill(); });
              ctx.restore();
            });
            pops.forEach((p) => outlined(ctx, p.text, p.x, p.y - p.t * 70, 44, p.color));
            drawPistol(ctx, mouse, recoil);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            circle(ctx, mouse.x, mouse.y, 22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mouse.x - 34, mouse.y); ctx.lineTo(mouse.x - 10, mouse.y); ctx.moveTo(mouse.x + 10, mouse.y); ctx.lineTo(mouse.x + 34, mouse.y);
            ctx.moveTo(mouse.x, mouse.y - 34); ctx.lineTo(mouse.x, mouse.y - 10); ctx.moveTo(mouse.x, mouse.y + 10); ctx.lineTo(mouse.x, mouse.y + 34); ctx.stroke();
          },
          onPointerMove(x, y) { mouse.x = x; mouse.y = y; },
          onPointerDown(x, y) {
            mouse.x = x; mouse.y = y; recoil = 1;
            G.Audio.play('shoot');
            for (let i = targets.length - 1; i >= 0; i--) {
              const t = targets[i], d = Math.hypot(x - t.x, y - t.y);
              if (d < t.r) {
                const pts = d < t.r * 0.25 ? 10 : d < t.r * 0.55 ? 5 : 2;
                score += pts;
                pops.push({ x: t.x, y: t.y, t: 0, text: '+' + pts, color: pts === 10 ? '#facc15' : '#fff' });
                targets.splice(i, 1);
                G.Audio.play('hit');
                if (score >= cfg.goal) finish(true, `${score}점 달성!`);
                return;
              }
            }
          },
        };
      },
    },

    // 3) 순서 기억하기 (화장실)
    memory: {
      title: '🧼 순서 기억하기', color: 0x3b82f6, cursor: 'pointer',
      intro: ['불이 켜지는 순서를 잘 기억했다가', '똑같은 순서로 눌러라! (클릭 또는 숫자키 1~4)'],
      goal: (c) => `${c.rounds}라운드 모두 성공! (${c.startLength}개부터 하나씩 늘어나요)`,
      bg(ctx) {
        ctx.fillStyle = '#e0f2fe'; ctx.fillRect(0, 0, CW, CH);
        ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 3;
        for (let i = 0; i <= CW; i += 45) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CH); ctx.stroke(); }
        for (let i = 0; i <= CH; i += 45) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CW, i); ctx.stroke(); }
      },
      create(ctx, cfg, finish, info) {
        const pads = [
          { x: 250, y: 155, c: '#e11d48', lit: '#fecdd3', icon: '🧼', f: 330 },
          { x: 650, y: 155, c: '#2563eb', lit: '#bfdbfe', icon: '🪥', f: 392 },
          { x: 250, y: 405, c: '#ca8a04', lit: '#fef08a', icon: '🧻', f: 440 },
          { x: 650, y: 405, c: '#16a34a', lit: '#bbf7d0', icon: '🛁', f: 523 },
        ];
        let round = 0, phase = 'wait', t = 0.8, showIdx = 0, inputIdx = 0, lit = -1, litT = 0;
        const seq = [];
        const newRound = () => {
          while (seq.length < cfg.startLength + round) seq.push(U.randInt(0, 3));
          phase = 'show'; showIdx = 0; t = 0.5;
        };
        const press = (i) => {
          if (phase !== 'input') return;
          lit = i; litT = 0.25; G.Audio.beep(pads[i].f, 0.25);
          if (seq[inputIdx] !== i) { phase = 'done'; finish(false, `${round + 1}라운드에서 틀렸어요! (목표 ${cfg.rounds}라운드)`); return; }
          inputIdx++;
          if (inputIdx >= seq.length) {
            round++;
            if (round >= cfg.rounds) { phase = 'done'; finish(true, `${cfg.rounds}라운드 모두 성공!`); }
            else { phase = 'wait'; t = 0.9; }
          }
        };
        return {
          update(dt) {
            litT -= dt; if (litT <= 0) lit = -1;
            if (phase === 'wait') { t -= dt; if (t <= 0) newRound(); }
            else if (phase === 'show') {
              t -= dt;
              if (t <= 0) {
                if (showIdx < seq.length) { lit = seq[showIdx]; litT = 0.45; G.Audio.beep(pads[lit].f, 0.4); showIdx++; t = 0.65; }
                else { phase = 'input'; inputIdx = 0; }
              }
            }
            const st = phase === 'show' ? '👀 잘 봐!' : phase === 'input' ? `👆 따라 눌러! (${inputIdx}/${seq.length})` : '준비...';
            info(`라운드 <b>${Math.min(round + 1, cfg.rounds)}</b> / ${cfg.rounds} &nbsp; ${st}`);
          },
          draw() {
            DEFS.memory.bg(ctx);
            pads.forEach((p, i) => {
              const on = lit === i;
              ctx.fillStyle = 'rgba(0,0,0,0.25)'; U.roundRect(ctx, p.x - 170 + 6, p.y - 105 + 8, 340, 210, 30); ctx.fill();
              ctx.fillStyle = on ? p.lit : p.c; U.roundRect(ctx, p.x - 170, p.y - 105, 340, 210, 30); ctx.fill();
              if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.stroke(); }
              text(ctx, p.icon, p.x, p.y - 8, 90);
              outlined(ctx, String(i + 1), p.x - 135, p.y - 70, 36, '#fff');
            });
            if (phase === 'show') outlined(ctx, '👀 잘 봐!', CW / 2, CH / 2 + 2, 40, '#facc15');
            if (phase === 'input') outlined(ctx, '👆 차례!', CW / 2, CH / 2 + 2, 40, '#4ade80');
          },
          onPointerDown(x, y) {
            pads.forEach((p, i) => { if (Math.abs(x - p.x) < 170 && Math.abs(y - p.y) < 105) press(i); });
          },
          onKey(code) {
            const m = code.match(/^(Digit|Numpad)([1-4])$/);
            if (m) press(Number(m[2]) - 1);
          },
        };
      },
    },

    // 4) 계란 뒤집기 타이밍 (부엌)
    timing: {
      title: '🍳 계란 뒤집기', color: 0x22c55e, cursor: 'pointer',
      intro: ['움직이는 막대가 초록색 구간에 왔을 때', '스페이스바나 클릭으로 멈춰라! (점점 빨라져요)'],
      goal: (c) => `${c.tries}번 중 ${c.goal}번 이상 성공!`,
      bg(ctx) {
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, 0, CW, CH);
        for (let y = 0; y < 260; y += 40) for (let x = 0; x < CW; x += 40) { ctx.fillStyle = ((x + y) / 40) % 2 ? '#fde68a' : '#fef3c7'; ctx.fillRect(x, y, 40, 40); }
        ctx.fillStyle = '#78716c'; ctx.fillRect(0, 260, CW, 300);
      },
      create(ctx, cfg, finish, info) {
        const BAR = { x: 100, y: 380, w: 700, h: 56 };
        let tryN = 0, ok = 0, pos = 0, dir = 1, phase = 'run', t = 0, result = null;
        const results = [];
        const newZone = () => { const w = U.lerp(150, 70, tryN / Math.max(1, cfg.tries - 1)); return { c: U.rand(w / 2 + 20, BAR.w - w / 2 - 20), w }; };
        let zone = newZone();
        const stop = () => {
          if (phase !== 'run') return;
          result = Math.abs(pos - zone.c) <= zone.w / 2;
          if (result) ok++;
          results.push(result);
          G.Audio.play(result ? 'pickup' : 'locked');
          phase = 'result'; t = 0.9;
        };
        return {
          update(dt) {
            if (phase === 'run') {
              pos += dir * 480 * cfg.speed * (1 + tryN * 0.15) * dt;
              if (pos > BAR.w) { pos = BAR.w; dir = -1; }
              if (pos < 0) { pos = 0; dir = 1; }
            } else if (phase === 'result') {
              t -= dt;
              if (t <= 0) {
                tryN++;
                const left = cfg.tries - tryN;
                if (ok >= cfg.goal || ok + left < cfg.goal || left <= 0) { phase = 'done'; finish(ok >= cfg.goal, `성공 ${ok}번 / ${tryN}번 시도 (목표 ${cfg.goal}번)`); return; }
                zone = newZone(); phase = 'run'; result = null;
              }
            }
            info(`시도 <b>${Math.min(tryN + 1, cfg.tries)}</b> / ${cfg.tries} &nbsp; ✅ 성공 <b>${ok}</b> (목표 ${cfg.goal})`);
          },
          draw() {
            DEFS.timing.bg(ctx);
            ctx.fillStyle = '#292524'; circle(ctx, 450, 190, 120); ctx.fill();
            ctx.fillStyle = '#44403c'; circle(ctx, 450, 190, 100); ctx.fill();
            ctx.fillStyle = '#292524'; ctx.fillRect(560, 175, 200, 30);
            const flip = phase === 'result' ? (0.9 - t) / 0.9 : 0;
            const ey = 190 - Math.sin(flip * Math.PI) * 110;
            ctx.save(); ctx.translate(450, ey); ctx.scale(1, result === true ? Math.cos(flip * Math.PI * 2) : 1);
            ctx.fillStyle = result === false ? '#3f3f46' : '#fff';
            ctx.beginPath(); ctx.ellipse(0, 0, 70, 55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = result === false ? '#18181b' : '#fbbf24'; circle(ctx, 5, -5, 26); ctx.fill();
            ctx.restore();
            if (phase === 'result') outlined(ctx, result ? '완벽해! 🍳' : '탔다... 💨', 450, 330, 44, result ? '#4ade80' : '#f87171');
            ctx.fillStyle = '#1c1917'; U.roundRect(ctx, BAR.x - 6, BAR.y - 6, BAR.w + 12, BAR.h + 12, 16); ctx.fill();
            ctx.fillStyle = '#57534e'; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
            ctx.fillStyle = '#22c55e'; ctx.fillRect(BAR.x + zone.c - zone.w / 2, BAR.y, zone.w, BAR.h);
            ctx.fillStyle = '#facc15'; ctx.fillRect(BAR.x + pos - 5, BAR.y - 16, 10, BAR.h + 32);
            for (let i = 0; i < cfg.tries; i++) {
              const r = results[i];
              text(ctx, r === undefined ? '⚪' : r ? '✅' : '❌', CW / 2 - (cfg.tries - 1) * 30 + i * 60, 490, 36);
            }
            text(ctx, '스페이스바 또는 클릭!', CW / 2, 535, 24, '#fafaf9');
          },
          onPointerDown() { stop(); },
          onKey(code) { if (code === 'Space' || code === 'Enter') stop(); },
        };
      },
    },
  };

  // 5) W를 가져가 리듬 (1층)
  DEFS.rhythm = {
    title: '💃 W를 가져가 리듬', color: 0xa855f7, cursor: 'default',
    intro: ['떨어지는 화살표가 선에 닿을 때', '같은 방향키(← ↓ ↑ →)를 눌러라! (WASD도 OK)'],
    goal: (c) => `${c.notes}개 중 ${c.goal}개 이상 성공!`,
    bg(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#2e1065'); g.addColorStop(1, '#0f0326');
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      ['rgba(255,80,180,0.18)', 'rgba(80,180,255,0.18)'].forEach((c, i) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(150 + i * 600, 0); ctx.lineTo(60 + i * 600, CH); ctx.lineTo(260 + i * 600, CH); ctx.fill();
      });
    },
    create(ctx, cfg, finish, info) {
      const lanes = [
        { x: 330, keys: ['ArrowLeft', 'KeyA'], sym: '←', c: '#f43f5e', f: 392 },
        { x: 430, keys: ['ArrowDown', 'KeyS'], sym: '↓', c: '#3b82f6', f: 440 },
        { x: 530, keys: ['ArrowUp', 'KeyW'], sym: '↑', c: '#22c55e', f: 523 },
        { x: 630, keys: ['ArrowRight', 'KeyD'], sym: '→', c: '#facc15', f: 587 },
      ];
      const JY = 470, SPEED = 330, beat = 60 / cfg.bpm;
      const notes = [];
      let tt = 1.5;
      for (let i = 0; i < cfg.notes; i++) { notes.push({ lane: U.randInt(0, 3), time: tt, state: 'live' }); tt += beat * U.pick([1, 1, 1, 2, 0.5]); }
      const endTime = notes[notes.length - 1].time + 1;
      let t = 0, hits = 0, combo = 0, judge = '', judgeT = 0;
      const flash = [0, 0, 0, 0];

      function drawDancer(x, y, s, phase, color) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.fillStyle = '#fff'; circle(ctx, 0, -110, 26); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(0, -20);
        ctx.moveTo(0, -20); ctx.lineTo(-24, 40); ctx.moveTo(0, -20); ctx.lineTo(24, 40);
        if (phase) { ctx.moveTo(0, -70); ctx.lineTo(0, -150); ctx.moveTo(0, -70); ctx.lineTo(-60, -70); }
        else { ctx.moveTo(0, -70); ctx.lineTo(0, -150); ctx.moveTo(0, -70); ctx.lineTo(60, -70); }
        ctx.stroke(); ctx.restore();
      }
      function press(li) {
        flash[li] = 0.15;
        let best = null, bd = 9;
        notes.forEach((n) => { if (n.state === 'live' && n.lane === li) { const d = Math.abs(t - n.time); if (d < bd) { bd = d; best = n; } } });
        if (best && bd < 0.17) {
          best.state = 'hit'; hits++; combo++;
          judge = bd < 0.07 ? 'PERFECT!' : 'GOOD'; judgeT = 0.5;
          G.Audio.beep(lanes[li].f, 0.15);
          if (hits >= cfg.goal) finish(true, `${hits}개 성공!`);
        } else { // 아무 때나 마구 누르면 감점
          hits = Math.max(0, hits - 1); combo = 0;
          judge = '헛박자! -1'; judgeT = 0.4;
          G.Audio.play('click');
        }
      }
      return {
        update(dt) {
          t += dt;
          notes.forEach((n) => { if (n.state === 'live' && t - n.time > 0.18) { n.state = 'miss'; combo = 0; judge = 'MISS'; judgeT = 0.5; } });
          for (let i = 0; i < 4; i++) flash[i] = Math.max(0, flash[i] - dt);
          judgeT -= dt;
          info(`🎵 성공 <b>${hits}</b> / ${cfg.notes} (목표 ${cfg.goal}) &nbsp; 🔥 콤보 ${combo}`);
          if (t >= endTime) finish(hits >= cfg.goal, `성공 ${hits}개 / ${cfg.notes}개 (목표 ${cfg.goal}개)`);
        },
        draw() {
          DEFS.rhythm.bg(ctx);
          const ph = Math.floor(t / (beat * 2)) % 2;
          drawDancer(130, 420, 1.3, ph, '#111');
          drawDancer(790, 420, 1.3, 1 - ph, '#7b3fe4');
          text(ctx, '쫄라맨', 130, 500, 22); text(ctx, '납치범', 790, 500, 22, '#d8b4fe');
          lanes.forEach((l, i) => {
            ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(l.x - 42, 0, 84, CH);
            ctx.strokeStyle = l.c; ctx.lineWidth = 5; circle(ctx, l.x, JY, 36); ctx.stroke();
            if (flash[i] > 0) { ctx.fillStyle = l.c; ctx.globalAlpha = flash[i] / 0.15 * 0.6; circle(ctx, l.x, JY, 36); ctx.fill(); ctx.globalAlpha = 1; }
            text(ctx, l.sym, l.x, JY + 2, 32, 'rgba(255,255,255,0.5)');
          });
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(280, JY - 2, 400, 4);
          notes.forEach((n) => {
            if (n.state === 'hit') return;
            const y = JY - (n.time - t) * SPEED;
            if (y < -40 || y > CH + 40) return;
            const l = lanes[n.lane];
            ctx.globalAlpha = n.state === 'miss' ? 0.3 : 1;
            ctx.fillStyle = l.c; circle(ctx, l.x, y, 32); ctx.fill();
            text(ctx, l.sym, l.x, y + 2, 34, '#fff');
            ctx.globalAlpha = 1;
          });
          if (judgeT > 0) outlined(ctx, judge, CW / 2, 230, 50, judge === 'MISS' ? '#fb7185' : judge === 'GOOD' ? '#86efac' : '#facc15');
          if (t < 1.4) outlined(ctx, '준비~ ♪', CW / 2, 160, 48, '#fff');
        },
        onKey(code) { lanes.forEach((l, i) => { if (l.keys.includes(code)) press(i); }); },
        onPointerDown(x, y) { if (y > JY - 70) lanes.forEach((l, i) => { if (Math.abs(x - l.x) < 45) press(i); }); },
      };
    },
  };

  // ------------------------------------------------------------------
  const MG = {
    defs: DEFS,

    init() {
      if (this.ready) return;
      this.ready = true;
      this.canvas = document.getElementById('mg-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.titleEl = document.getElementById('mg-title');
      this.infoEl = document.getElementById('mg-info');
      this.btnEl = document.getElementById('mg-buttons');
      const pos = (e) => {
        const r = this.canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * CW / r.width, y: (e.clientY - r.top) * CH / r.height };
      };
      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.running && this.game.onPointerDown) { const p = pos(e); this.game.onPointerDown(p.x, p.y); }
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.running && this.game.onPointerMove) { const p = pos(e); this.game.onPointerMove(p.x, p.y); }
      });
      window.addEventListener('resize', () => this.fit());
    },

    fit() {
      if (!this.canvas) return;
      const s = Math.min((window.innerWidth - 80) / CW, (window.innerHeight - 230) / CH, 1.25);
      this.canvas.style.width = Math.round(CW * s) + 'px';
      this.canvas.style.height = Math.round(CH * s) + 'px';
    },

    open(id, part, onClose) {
      this.init();
      this.def = DEFS[id];
      this.cfg = C.minigames[id];
      this.part = part;
      this.onClose = onClose;
      this.success = false;
      G.UI.screen('minigame');
      this.fit();
      this.titleEl.textContent = this.def.title;
      this.intro();
    },

    buttons(list) {
      this.btnEl.innerHTML = '';
      list.forEach(([label, fn, cls]) => {
        const b = document.createElement('button');
        b.textContent = label;
        if (cls) b.className = cls;
        b.onclick = fn;
        this.btnEl.appendChild(b);
      });
    },

    intro() {
      this.running = false;
      const ctx = this.ctx;
      this.def.bg(ctx);
      ctx.fillStyle = 'rgba(10,5,30,0.62)'; ctx.fillRect(0, 0, CW, CH);
      outlined(ctx, this.def.title, CW / 2, 110, 60, '#fff');
      this.def.intro.forEach((l, i) => text(ctx, l, CW / 2, 210 + i * 46, 30));
      outlined(ctx, '🎯 ' + this.def.goal(this.cfg), CW / 2, 345, 34, '#facc15');
      text(ctx, `🎁 성공 보상: 노스니의 ${C.parts[this.part].label}`, CW / 2, 410, 30, '#86efac');
      text(ctx, '⏸ 미니게임 중에는 무적! (끝나고 1초 동안도 무적)', CW / 2, 470, 24, '#e9d5ff');
      this.infoEl.innerHTML = '';
      this.canvas.style.cursor = 'default';
      this.buttons([['▶ 시작하기', () => this.play(), 'big'], ['나가기', () => this.close()]]);
    },

    play() {
      G.Audio.play('click');
      this.game = this.def.create(this.ctx, this.cfg, (ok, msg) => this.finish(ok, msg), (html) => { this.infoEl.innerHTML = html; });
      this.running = true;
      this.canvas.style.cursor = this.def.cursor || 'default';
      this.buttons([['나가기', () => this.close()]]);
      this.last = performance.now();
      const tok = this.loopTok = {};
      const step = (now) => {
        if (!this.running || this.loopTok !== tok) return;
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.game.update(dt);
        if (!this.running) return;
        this.game.draw();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    finish(ok, msg) {
      if (!this.running) return;
      this.running = false;
      this.success = ok;
      this.canvas.style.cursor = 'default';
      this.game.draw();
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, CW, CH);
      outlined(ctx, ok ? '🎉 성공!' : '😵 실패...', CW / 2, CH / 2 - 70, 86, ok ? '#facc15' : '#fb7185');
      text(ctx, msg, CW / 2, CH / 2 + 20, 30);
      if (ok) outlined(ctx, `🎁 노스니의 ${C.parts[this.part].label} 획득!`, CW / 2, CH / 2 + 90, 38, '#86efac');
      else text(ctx, '다시 도전할 수 있어요!', CW / 2, CH / 2 + 85, 28, '#e9d5ff');
      G.Audio.play(ok ? 'success' : 'fail');
      if (ok) {
        // 목표 달성 → 잠깐 보여주고 자동으로 나가며 보상 지급
        this.buttons([['🎁 보상 받는 중... (자동으로 돌아가요)', () => this.close(), 'big']]);
        const token = this.token = {};
        setTimeout(() => { if (this.token === token && this.onClose) this.close(); }, 1500);
      } else {
        this.buttons([['🔄 다시 도전', () => this.play(), 'big'], ['나가기', () => this.close()]]);
      }
    },

    // 제한시간 종료 등으로 강제 종료 (보상 없음)
    abort() {
      this.token = null;
      this.running = false;
      this.success = false;
      this.onClose = null;
    },

    close() {
      this.token = null;
      this.running = false;
      const ok = this.success, cb = this.onClose;
      this.success = false; this.onClose = null;
      if (cb) cb(ok);
    },

    onKey(code) {
      if (code === 'Escape') { this.close(); return; }
      if (this.running) { if (this.game.onKey) this.game.onKey(code); return; }
      if (code === 'Enter' || code === 'Space') { const b = this.btnEl.querySelector('button'); if (b) b.click(); }
    },
  };

  G.Minigames = MG;
})();
