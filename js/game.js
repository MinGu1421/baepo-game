// 메인 게임 진행 (상태 관리, 입력, 상호작용, 목숨/부활, 제한시간, 순위표)
(function () {
  const C = G.CONFIG, U = G.U;
  const $ = (id) => document.getElementById(id);
  const PART_TOTAL = Object.keys(C.parts).length;
  const MIN = Math.round(C.timeLimit / 60);

  const Game = {
    // start | form | intro | ready | playing | paused | minigame | caught | capture | ending | gameover | win
    state: 'start',
    difficulty: C.defaultDifficulty,
    player: null, // { grade, cls, num, nick } — 동의 안 하면 null (순위 기록 안 함)
    lives: C.lives,
    elapsed: 0,
    timeLeft: C.timeLimit,
    keys: {},
    fx: { blind: 0, slow: 0, radar: 0, selfieCd: 0, invuln: 0 },

    init() {
      G.UI.init();
      if (!window.THREE) { G.UI.screen('load-error'); return; }

      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      r.setSize(window.innerWidth, window.innerHeight);
      $('game').appendChild(r.domElement);

      const scene = this.scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1b1233);
      scene.fog = new THREE.Fog(0x1b1233, 12, 42);
      const cam = this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 200);
      scene.add(cam);
      scene.add(new THREE.HemisphereLight(0xd8d0ff, 0x4a3a5a, 0.75));
      const moon = new THREE.DirectionalLight(0xaab8ff, 0.35);
      moon.position.set(-20, 40, 10);
      scene.add(moon);

      G.Player.init(cam, scene);
      G.Enemy.init(scene);
      G.Cutscene.init(scene);
      G.Minimap.init();
      this.bindInput();
      this.bindUI();
      this.newGame();
      this.toTitle(false);

      window.addEventListener('resize', () => {
        cam.aspect = window.innerWidth / window.innerHeight;
        cam.updateProjectionMatrix();
        r.setSize(window.innerWidth, window.innerHeight);
      });
      this.last = performance.now();
      // 다른 창/탭으로 가 있던 동안(화면이 안 그려지는 동안)은 기록 시간에 몰아서 더하지 않음
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.last = performance.now(); });
      requestAnimationFrame((t) => this.loop(t));
    },

    diff() { return C.difficulty[this.difficulty]; },

    // ---------------- 게임 시작/재시작 ----------------
    newGame() {
      G.Fx.clear();
      G.Ending.reset();
      G.World.build(this.scene); // 미로는 매 판 새로 랜덤 생성
      G.Minimap.reset();
      G.Inventory.reset();
      this.lives = C.lives;
      this.elapsed = 0;
      this.timeLeft = C.timeLimit;
      this.fx = { blind: 0, slow: 0, radar: 0, selfieCd: 0, invuln: 0 };
      this.mazeEntered = false;
      this.curRoom = 'bedroom';
      this.visited = {};
      this.lastRoomName = '';
      G.Player.reset();
      G.Player.place(G.World.spawn.x, G.World.spawn.z, -Math.PI / 2);
      G.Enemy.reset();
      G.Enemy.placeFar('house');
      G.Enemy.frozen = this.diff().startSafeTime;
      G.UI.clearFlash();
      G.UI.subtitle(null);
      G.UI.bag(false);
      G.UI.danger(0); G.UI.blind(0); G.UI.radar(false);
      G.UI.hearts(this.lives, C.lives);
    },

    // 시작 버튼 → 개인정보 동의 → 정보 입력 → 인트로
    openConsent() {
      G.Audio.init();
      G.Audio.play('click');
      this.state = 'form';
      G.UI.screen('consent-screen');
    },
    agree(ok) {
      G.Audio.play('click');
      if (!ok) {
        this.player = null;
        G.UI.toast('동의하지 않아도 게임은 할 수 있어요!<br>(순위표에는 기록되지 않아요)');
        this.openDifficulty();
        return;
      }
      G.UI.screen('profile-screen');
      $('profile-error').textContent = '';
      setTimeout(() => $('in-nick').focus(), 50);
    },
    submitProfile() {
      const grade = Number($('in-grade').value), cls = Number($('in-class').value);
      const nick = $('in-nick').value.trim();
      const err = (m) => { $('profile-error').textContent = m; G.Audio.play('locked'); };
      if (!grade) return err('학년을 골라주세요');
      if (!cls || cls < 1 || cls > 20) return err('반을 숫자로 적어주세요 (1~20)');
      if (!nick) return err('닉네임을 적어주세요');
      if (nick.length > 8) return err('닉네임은 8글자까지예요');
      this.player = { grade, cls, nick };
      document.activeElement && document.activeElement.blur();
      this.openDifficulty();
    },
    // 로그인(학년·반·닉네임) 뒤 난이도 고르기. 5·6학년은 「쉬움」을 고를 수 없어요.
    // (개인정보 동의를 안 해서 학년을 모르면 모든 난이도 선택 가능)
    openDifficulty() {
      this.state = 'difficulty';
      const p = this.player, lockEasy = !!p && p.grade >= 5;
      if (lockEasy && this.difficulty === 'easy') this.difficulty = 'normal';
      $('diff-hello').textContent = p ? `${p.nick}님, 난이도를 골라주세요` : '난이도를 골라주세요';
      $('diff-lock').textContent = lockEasy ? '🔒 5·6학년은 「쉬움」을 고를 수 없어요' : '';
      document.querySelectorAll('[data-diff]').forEach((b) => {
        b.disabled = lockEasy && b.dataset.diff === 'easy';
        b.classList.toggle('selected', b.dataset.diff === this.difficulty);
      });
      this.renderDiffInfo();
      G.UI.screen('difficulty-screen');
    },
    startFromDifficulty() {
      const p = this.player;
      if (p && p.grade >= 5 && this.difficulty === 'easy') return; // 안전장치
      this.startRun();
    },
    startRun() {
      this.newGame();
      this.playIntro();
    },
    restart() { // 같은 플레이어로 다시 하기
      G.Audio.init();
      this.startRun();
    },
    playIntro() {
      this.state = 'intro';
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.hud(false);
      G.UI.screen('skip-layer');
      G.Audio.setMusic(true);
      G.Audio.setChase(false);
      G.Cutscene.start('intro', {}, () => this.afterIntro());
    },
    afterIntro() {
      G.UI.clearFlash();
      G.Player.reset();
      G.Player.place(G.World.spawn.x, G.World.spawn.z, -Math.PI / 2);
      G.Enemy.reset();
      G.Enemy.placeFar('house');
      G.Enemy.frozen = this.diff().startSafeTime;
      this.beginPlay();
      const who = this.player ? `${this.player.nick}, ` : '';
      G.UI.toast(`🛏️ ${who}납치범의 집 2층 침실에 갇혔다!<br>${MIN}분 안에 탈출하자!`);
    },
    skipCutscene() {
      if (this.state === 'intro') { G.Cutscene.finish(); this.requestLock(); }
      else if (this.state === 'capture') G.Cutscene.finish();
      else if (this.state === 'ending') G.Ending.skip();
    },

    beginPlay() {
      this.state = 'ready';
      G.UI.hud(true);
      G.UI.screen('resume-screen');
      G.Audio.setMusic(true);
      this.requestLock();
    },

    toTitle(rebuild) {
      if (rebuild) this.newGame();
      this.state = 'start';
      this.player = null;
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.hud(false);
      G.UI.screen('start-screen');
      G.Audio.setMusic(false);
      this.renderBoard(this.boardDiff || 'normal');
    },

    requestLock() {
      const el = this.renderer.domElement;
      try {
        const p = el.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* 실패하면 클릭 안내 화면이 그대로 남아 있음 */ }
    },

    pause() {
      this.state = 'paused';
      G.UI.bag(false);
      G.UI.screen('pause-screen');
      G.Audio.setMusic(false);
    },

    toggleSound() {
      const on = G.Audio.toggle();
      G.UI.sound(on);
      G.UI.toast(on ? '🔊 소리 켜짐' : '🔇 소리 꺼짐');
    },

    // ---------------- 메인 루프 ----------------
    loop(now) {
      this.realDt = Math.max(0, (now - this.last) / 1000); // 실제 시계로 흐른 시간 (기록·남은 시간용)
      const dt = Math.min(0.05, this.realDt);               // 움직임 계산용 (버벅여도 벽을 뚫지 않게 제한)
      this.last = now;
      G.Fx.update(dt);
      switch (this.state) {
        case 'start': case 'form': case 'difficulty':
          G.Player.yaw += dt * 0.15; G.Player.sync(dt);
          G.Enemy.model.animate(dt, false);
          break;
        case 'intro': case 'capture': G.Cutscene.update(dt); break;
        case 'playing': this.update(dt); break;
        case 'caught': this.updateCaught(dt); break;
        case 'ending': G.Ending.update(dt); break;
        case 'minigame':
          this.tickTime(dt);
          if (this.timeLeft <= 0) { G.Minigames.abort(); this.capture('time'); }
          break;
        default: G.Enemy.model.animate(dt, false);
      }
      G.Audio.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame((t) => this.loop(t));
    },

    // 클리어 시간·남은 시간은 컴퓨터가 버벅여도 실제 시계대로 흐르게 (일시정지·컷신 중에는 호출되지 않음)
    tickTime() {
      const t = this.realDt || 0;
      this.elapsed += t;
      this.timeLeft = Math.max(0, this.timeLeft - t);
    },

    update(dt) {
      const fx = this.fx, P = G.Player, W = G.World, E = G.Enemy;
      const diff = this.diff();
      this.tickTime(dt);
      if (this.timeLeft <= 0) { this.capture('time'); return; }
      for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);

      P.update(dt, this.keys, fx.slow > 0 ? C.traps.slow.factor : 1);
      const pc = W.cellAt(P.pos.x, P.pos.z);
      if (pc.room) this.curRoom = pc.room;

      if (pc.zone === 'maze' && !this.mazeEntered) {
        this.mazeEntered = true;
        E.placeFar('maze');
        E.frozen = C.enemy.mazeEnterSafeTime;
        G.UI.toast('🌳 밖으로 나왔다! 미로 맨 끝의<br>노스니 조합대와 심장 상자를 찾아라!', 'good');
      }

      E.update(dt, diff.enemySpeed, diff.catchUp);
      E.model.marker.visible = fx.radar > 0;
      const ed = Math.hypot(E.pos.x - P.pos.x, E.pos.z - P.pos.z);
      if (ed < C.enemy.catchDistance && fx.invuln <= 0 && E.frozen <= 0) { this.caught(pc.zone === 'maze' ? 'maze' : 'house'); return; }

      let danger = U.clamp(1 - ed / C.enemy.dangerDistance, 0, 1);
      if (E.frozen > 0) danger *= 0.3;
      G.UI.danger(danger * 0.9);
      G.Audio.setDanger(danger);

      this.target = this.findTarget();
      G.UI.prompt(this.target ? this.target.prompt : null);
      this.updateHUD();
    },

    updateHUD() {
      const UI = G.UI, fx = this.fx, P = G.Player, E = G.Enemy;
      UI.hearts(this.lives, C.lives);
      const room = G.Rooms.byId[this.curRoom];
      const icon = this.curRoom === 'maze' ? '🌿' : this.curRoom === 'yard' ? '🌳' : '📍';
      const name = room ? room.name : '';
      if (name !== this.lastRoomName) {
        this.lastRoomName = name;
        if (!this.visited[this.curRoom]) { this.visited[this.curRoom] = true; UI.banner(name); }
      }
      UI.set('room-name', `${icon} ${name}`);
      UI.set('objective', this.objective());
      UI.timer(this.timeLeft);
      UI.stamina(P.stamina / C.player.staminaMax * 100, P.exhausted);
      G.Minimap.draw(`${icon} ${name}`);

      const st = [];
      if (fx.invuln > 0) st.push(`🛡 무적 ${fx.invuln.toFixed(1)}초`);
      if (fx.slow > 0) st.push(`🐌 느려짐 ${Math.ceil(fx.slow)}초`);
      if (E.frozen > 1.5) st.push(`😴 납치범 대기 ${Math.ceil(E.frozen)}초`);
      if (fx.selfieCd > 0 && G.Inventory.selfie > 0) st.push(`📱 충전 ${Math.ceil(fx.selfieCd)}초`);
      UI.set('status-icons', st.map((s) => `<span>${s}</span>`).join(''));

      UI.blind(fx.blind > 0 ? Math.min(1, fx.blind / 0.4) : 0);

      if (fx.radar > 0) {
        const f = P.forward();
        const rx = E.pos.x - P.pos.x, rz = E.pos.z - P.pos.z;
        const lx = rx * -f.z + rz * f.x, lf = rx * f.x + rz * f.z;
        UI.radar(true, Math.atan2(lx, lf), Math.hypot(rx, rz));
      } else UI.radar(false);

      if (G.Inventory.changed) {
        G.Inventory.changed = false;
        UI.set('bag-bar', G.Inventory.barHTML());
        UI.set('bag-content', G.Inventory.panelHTML());
        UI.set('parts-strip', this.partsStrip());
      }
    },

    // 위쪽 안내: 어느 방에 어떤 신체가 있는지
    partsStrip() {
      const inv = G.Inventory;
      return G.Rooms.list.filter((r) => r.part).map((r) => {
        const p = C.parts[r.part], has = inv.parts[r.part];
        return `<span class="${has ? 'got' : ''}">${r.icon}${r.name}: ${p.icon}${p.label} ${has ? '✅' : ''}</span>`;
      }).join('');
    },

    objective() {
      const inv = G.Inventory, W = G.World, R = G.Rooms;
      const n = inv.partCount();
      const lines = [];
      if (this.curRoom === 'maze' || this.curRoom === 'yard') {
        const ns = W.nosni;
        if (!ns.assembled) lines.push(`🧩 미로 맨 끝 <b>노스니 조합대</b>에서 몸 조립하기 (${n}/${PART_TOTAL})`);
        if (n < PART_TOTAL) lines.push('⚠️ 몸이 모자라! 집 안 미니게임을 클리어하자');
        lines.push(`${inv.heart ? '✅' : '⬜'} 조합대 옆 상자에서 <b>노스니의 심장</b> 찾기`);
        if (inv.heart && ns.assembled) lines.push('❤️ 노스니에게 심장을 주자! (E)');
        return lines.join('<br>');
      }
      if (this.curRoom === 'stairs') return '⬇️ 계단을 내려가 1층으로!';
      const room = R.byId[this.curRoom];
      if (!room) return '';
      if ((C.chests[room.id] || []).includes('key')) lines.push(`${inv.keys[room.id] ? '✅' : '⬜'} 상자에서 ${room.name} 열쇠 찾기`);
      const stn = W.stations.find((s) => s.room === room.id);
      if (stn) lines.push(`${stn.cleared ? '✅' : '⬜'} 미니게임 → 노스니의 ${C.parts[stn.part].label}`);
      W.doors.filter((d) => d.room === room.id).forEach((d) => {
        lines.push(`${d.locked ? '⬜' : '✅'} ${R.byId[d.key].name} 열쇠로 문 열기 → ${d.to}`);
      });
      // 다른 방의 문을 열 수 있는 열쇠를 들고 있으면 알려줌
      W.doors.forEach((d) => {
        if (d.locked && d.room !== room.id && inv.keys[d.key]) lines.push(`🔑 ${R.byId[d.key].name} 열쇠로 <b>${R.byId[d.room].name}</b>의 문을 열 수 있어! (→ ${d.to})`);
      });
      return lines.join('<br>');
    },

    // ---------------- 상호작용 ----------------
    findTarget() {
      const P = G.Player.pos, f = G.Player.forward(), W = G.World, inv = G.Inventory;
      // 실제로 할 수 있는 행동(action)이 있는 대상을 안내 문구보다 우선
      let best = null, bestD = 2.4, info = null, infoD = 2.4;
      const consider = (x, z, y, prompt, action) => {
        if (Math.abs(y - P.y) > 2) return;
        const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
        const dot = (dx * f.x + dz * f.z) / (d || 1);
        if (d > 1.3 && dot < 0.35) return;
        if (action) { if (d <= bestD) { best = { prompt, action }; bestD = d; } }
        else if (d <= infoD) { info = { prompt, action: null }; infoD = d; }
      };
      W.chests.forEach((ch) => { if (!ch.opened) consider(ch.wx, ch.wz, ch.wy, 'E: 상자 열기 📦', () => this.openChest(ch)); });
      W.doors.forEach((dr) => {
        if (!dr.locked) return;
        const c = W.center(dr.x, dr.z);
        const name = G.Rooms.byId[dr.key].name;
        const prompt = inv.keys[dr.key] ? `E: 문 열기 (🔑 ${name} 열쇠)` : `🔒 잠김 — ${name} 열쇠가 필요해`;
        consider(c.x, c.z, dr.cell.floorY, prompt, () => this.tryDoor(dr));
      });
      W.stations.forEach((st) => {
        const def = G.Minigames.defs[st.game], y = W.cell(st.x, st.z).floorY;
        if (st.cleared) consider(st.wx, st.wz, y, `✔ ${def.title} 클리어 완료!`, null);
        else consider(st.wx, st.wz, y, `E: 미니게임 「${def.title}」`, () => this.openMinigame(st));
      });
      const ns = W.nosni;
      if (!ns.revived && !ns.busy) {
        const n = inv.partCount();
        if (!ns.assembled) {
          if (n >= PART_TOTAL) consider(ns.x, ns.z, 0, 'E: 노스니 몸 조립하기 🧩', () => this.assemble());
          else consider(ns.x, ns.z, 0, `🧩 노스니 조합대 — 몸이 부족해 (${n}/${PART_TOTAL})`, null);
        } else if (inv.heart) consider(ns.x, ns.z, 0, 'E: 노스니에게 심장 주기 ❤️', () => this.giveHeart());
        else consider(ns.x, ns.z, 0, '💤 노스니에게 심장이 필요해 — 옆 상자를 열자', null);
      }
      return best || info;
    },

    interact() {
      if (this.target && this.target.action) this.target.action();
    },

    assemble() {
      const ns = G.World.nosni;
      ns.busy = true;
      G.UI.toast('🧩 노스니의 몸을 조립한다!', 'good');
      G.World.assembleNosni(() => {
        ns.busy = false;
        G.Audio.play('success');
        G.UI.toast(G.Inventory.heart ? '🧩 조립 완료! 이제 심장을 주자 ❤️' : '🧩 조립 완료! 옆 상자에서 심장을 찾자', 'good');
      });
    },

    openChest(ch) {
      const inv = G.Inventory, W = G.World;
      ch.opened = true;
      G.Audio.play('chestOpen');
      const room = G.Rooms.byId[ch.room];
      switch (ch.content) {
        case 'key': {
          inv.addKey(ch.room); W.openChestAnim(ch, '🔑'); G.Audio.play('pickup');
          const door = W.doors.find((d) => d.key === ch.room);
          const where = door && door.room !== ch.room ? `<br>${G.Rooms.byId[door.room].name}로 가서 문을 열자! (→ ${door.to})` : '';
          G.UI.toast(`🔑 ${room.name} 열쇠를 얻었다!${where}`, 'good');
          break;
        }
        case 'selfie':
          inv.addSelfie(); W.openChestAnim(ch, '📱'); G.Audio.play('pickup');
          G.UI.toast('📱 셀카폰 획득!<br>Q키로 납치범 위치를 찍어보자', 'good'); break;
        case 'heart':
          inv.addHeart(); W.openChestAnim(ch, '❤️'); G.Audio.play('success');
          G.UI.toast(W.nosni.assembled ? '❤️ 노스니의 심장을 찾았다!<br>노스니에게 주자 (E)' : '❤️ 노스니의 심장을 찾았다!<br>먼저 조합대에서 몸을 조립하자', 'good');
          break;
        default: {
          const T = C.traps, list = Object.keys(T).filter((k) => T[k].enabled);
          if (!list.length) { W.openChestAnim(ch, '💨'); G.UI.toast('💨 빈 상자였다...'); return; }
          const type = U.pick(list);
          W.openChestAnim(ch, type === 'flash' ? '📱' : '💀'); // 오작동 셀카폰은 진짜처럼 보임
          this.applyTrap(type);
        }
      }
    },

    applyTrap(type) {
      const T = C.traps;
      if (type === 'flash') {
        // 셀카폰이 나온 줄 알았는데... 오작동 플래시가 쫄라맨 얼굴로! 2초간 앞이 안 보임
        G.Audio.play('pickup');
        G.UI.toast('📱 셀카폰 획득...?');
        setTimeout(() => {
          if (this.state !== 'playing') return;
          G.Audio.play('camera');
          G.UI.subtitle('📱 ' + T.flash.label, 2.4);
          this.fx.blind = T.flash.duration;
        }, 600);
        return;
      }
      G.Audio.play('trap');
      G.UI.flash('rgba(255,0,40,0.5)', 0.8);
      if (type === 'summon') { G.Enemy.placeNear(3, 5); G.Enemy.frozen = T.summon.grace; }
      if (type === 'slow') this.fx.slow = T.slow.duration;
      G.UI.toast(`💀 함정 상자! ${T[type].label}`, 'bad');
    },

    useSelfie() {
      const inv = G.Inventory;
      if (inv.selfie <= 0) { G.UI.toast('📱 셀카폰이 없어! 상자를 열어 찾아보자'); return; }
      if (this.fx.selfieCd > 0) { G.UI.toast(`📱 충전 중... ${Math.ceil(this.fx.selfieCd)}초`); return; }
      inv.useSelfie();
      this.fx.radar = C.selfie.duration;
      this.fx.selfieCd = C.selfie.cooldown;
      G.Audio.play('camera');
      G.UI.flash('rgba(255,255,255,0.7)', 0.4);
      G.UI.toast(`📸 찰칵! 납치범 위치가 보인다 (${C.selfie.duration}초)`, 'good');
    },

    tryDoor(dr) {
      const inv = G.Inventory, R = G.Rooms;
      const name = R.byId[dr.key].name;
      if (!inv.keys[dr.key]) {
        G.Audio.play('locked');
        const tip = dr.key !== dr.room ? `<br>${name}에서 열쇠를 찾아오자` : '<br>이 방 상자를 열어보자';
        G.UI.toast(`🔒 ${name} 열쇠가 필요해!${tip}`, 'bad');
        return;
      }
      inv.useKey(dr.key);
      G.World.openDoor(dr); G.Audio.play('door');
      G.UI.toast(dr.front ? '🚪 문이 열렸다! 마당을 지나 미로로!' : `🚪 문이 열렸다! ${dr.to}(으)로 가자`, 'good');
    },

    openMinigame(st) {
      this.state = 'minigame'; // 미니게임 중에는 무적 (납치범 멈춤)
      G.UI.prompt(null);
      G.UI.bag(false);
      G.Audio.setMusic(false);
      if (document.pointerLockElement) document.exitPointerLock();
      G.Minigames.open(st.game, st.part, (success) => {
        if (success && !st.cleared) {
          G.World.setStationCleared(st);
          G.Inventory.addPart(st.part);
          const n = G.Inventory.partCount(), p = C.parts[st.part];
          G.World.updateFrontDoor(n);
          G.UI.toast(`${p.icon} 노스니의 ${p.label} 획득! (${n}/${PART_TOTAL})`, 'good');
        }
        this.fx.invuln = C.enemy.minigameInvuln; // 끝나고 1초 무적
        this.state = 'ready';
        G.UI.screen('resume-screen');
        this.requestLock();
      });
    },

    giveHeart() {
      this.state = 'ending';
      G.World.nosni.revived = true;
      G.UI.prompt(null); G.UI.bag(false); G.UI.hud(false);
      G.UI.danger(0); G.UI.blind(0); G.UI.radar(false);
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.screen('skip-layer');
      G.Audio.setMusic(true);
      G.Ending.start(this);
    },

    // ---------------- 잡힘 / 부활 / 종료 ----------------
    caught(zone) {
      this.state = 'caught';
      this.lives--;
      this.caughtZone = zone;
      this.caughtT = 1.8;
      G.Audio.play('caught');
      G.UI.flash('rgba(255,0,40,0.7)', 1.0);
      G.UI.hearts(this.lives, C.lives);
      G.UI.set('caught-sub', this.lives > 0 ? `목숨 -1 · 남은 목숨 ${'❤️'.repeat(this.lives)}` : '목숨을 모두 잃었다...');
      G.UI.screen('caught-screen');
      G.UI.prompt(null);
      G.Player.shake = 0.5;
    },

    updateCaught(dt) {
      this.tickTime(dt);
      this.caughtT -= dt;
      G.Enemy.model.animate(dt, false);
      G.Player.sync(dt);
      if (this.caughtT > 0) return;
      if (this.lives <= 0) { this.capture('lives'); return; }
      this.respawn();
    },

    respawn() {
      const zone = this.caughtZone, W = G.World;
      if (zone === 'maze') G.Player.place(W.yardStart.x, W.yardStart.z, -Math.PI / 2);
      else G.Player.place(W.spawn.x, W.spawn.z, -Math.PI / 2);
      this.curRoom = zone === 'maze' ? 'yard' : 'bedroom';
      this.fx.blind = 0; this.fx.slow = 0;
      G.Enemy.placeFar(zone);
      G.Enemy.frozen = C.enemy.respawnSafeTime;
      G.UI.screen(null);
      G.UI.toast(zone === 'maze' ? '🌳 미로 입구(마당)로 돌아왔다.<br>가방 속 아이템은 그대로!' : '🛏️ 침실로 돌아왔다.<br>가방 속 아이템은 그대로!');
      if (document.pointerLockElement === this.renderer.domElement) this.state = 'playing';
      else this.pause();
    },

    // 게임오버 컷신: 납치범이 머리를 잡고 집으로 들어감
    capture(reason) {
      this.state = 'capture';
      this.overReason = reason;
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.hud(false); G.UI.prompt(null); G.UI.bag(false);
      G.UI.danger(0); G.UI.blind(0); G.UI.radar(false);
      G.UI.clearFlash();
      G.UI.screen('skip-layer');
      G.Audio.setMusic(true);
      G.Audio.setChase(true);
      G.Cutscene.start('capture', { reason }, () => this.gameOver());
    },

    stats() {
      const m = Math.floor(this.elapsed / 60), s = Math.floor(this.elapsed % 60);
      return `⏱ 클리어 시간 <b>${m}분 ${s}초</b> · ❤️ 남은 목숨 <b>${this.lives}</b> · 난이도 <b>${this.diff().label}</b>`;
    },

    gameOver() {
      this.state = 'gameover';
      G.UI.hud(false);
      const why = this.overReason === 'time' ? `⏰ ${MIN}분 안에 탈출하지 못했다...` : '💔 목숨을 모두 잃었다...';
      G.UI.set('gameover-why', `${why}<br>납치범이 쫄라맨의 머리를 잡고 집으로 끌고 들어갔다!`);
      G.UI.set('gameover-stats', `🧩 모은 노스니의 몸 ${G.Inventory.partCount()}/${PART_TOTAL} · 난이도 <b>${this.diff().label}</b>`);
      G.UI.screen('gameover-screen');
      G.UI.clearFlash();
      G.Audio.setMusic(false);
      G.Audio.play('fail');
    },

    win() {
      this.state = 'win';
      if (document.pointerLockElement) document.exitPointerLock();
      G.UI.hud(false);
      const diff = this.difficulty, stats = this.stats();
      const showBoard = () => G.UI.set('win-board', G.Leaderboard.topHTML(diff));
      if (this.player) {
        const p = this.player;
        G.UI.set('win-stats', `${stats}<br>⏳ 순위표에 기록하는 중...`);
        G.Leaderboard.add(diff, p, this.elapsed).then((rank) => {
          if (this.state !== 'win') return; // 그 사이 다시 시작했으면 무시
          const who = `<b>${p.grade}학년 ${p.cls}반 ${G.UI.esc(p.nick)}</b>`;
          const rankText = rank
            ? `🏆 ${who} — ${C.difficulty[diff].label} 난이도 <b class="rank">${rank}등!</b>`
            : `⚠️ ${who} — 인터넷이 연결되면 순위표에 자동으로 올라가요`;
          G.UI.set('win-stats', `${stats}<br>${rankText}`);
          showBoard();
        });
      } else {
        G.UI.set('win-stats', `${stats}<br>순위표에 기록하지 않았어요 (개인정보 동의 안 함)`);
      }
      showBoard();
      G.Leaderboard.fetchTop(diff).then(() => { if (this.state === 'win') showBoard(); });
      $('win-board-title').textContent = `🏆 ${this.diff().label} 난이도 TOP 3`;
      G.UI.screen('win-screen');
      G.UI.clearFlash();
      G.Audio.setMusic(false);
      G.Audio.play('success');
    },

    // ---------------- 시작 화면: 난이도 정보 ----------------
    // 순위는 leaderboard.html 에서만 보여줘요. 여기서는 인터넷이 끊겼을 때 못 올린 기록만 다시 올려요.
    renderBoard() {
      G.Leaderboard.flushPending();
    },

    renderDiffInfo() {
      const D = C.difficulty, base = D.easy, cur = this.diff();
      const max = Math.max(...Object.values(D).map((d) => d.enemySpeed));
      const rows = [
        { name: '🏃 납치범 속도', val: `${cur.enemySpeed}`, pct: cur.enemySpeed / max, up: cur.enemySpeed > base.enemySpeed },
        { name: '🚀 멀리서 따라잡기', val: `×${cur.catchUp}`, pct: (cur.catchUp - 1) / 0.5, up: cur.catchUp > base.catchUp },
        { name: '⏳ 시작 후 납치범 대기', val: `${cur.startSafeTime}초`, pct: cur.startSafeTime / base.startSafeTime, up: cur.startSafeTime < base.startSafeTime, upText: '▼ 짧아짐' },
      ];
      $('diff-info').innerHTML = rows.map((r) => `
        <div class="diff-row"><span class="dn">${r.name}</span>
          <span class="bar"><i style="width:${Math.round(U.clamp(r.pct, 0.05, 1) * 100)}%"></i></span>
          <b>${r.val}</b>${r.up ? `<em>${r.upText || '▲ 업그레이드!'}</em>` : '<em class="base">기본</em>'}</div>`).join('');
    },

    // ---------------- 입력 ----------------
    bindInput() {
      window.addEventListener('keydown', (e) => {
        const typing = e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
        if (typing) { if (e.code === 'Enter' && this.state === 'form') this.submitProfile(); return; }
        if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (this.state === 'minigame') { if (!e.repeat) G.Minigames.onKey(e.code); return; }
        this.keys[e.code] = true;
        if (e.repeat) return;
        switch (this.state) {
          case 'start':
            if (e.code === 'Enter') this.openConsent();
            break;
          case 'difficulty':
            if (e.code === 'Enter') this.startFromDifficulty();
            break;
          case 'intro': case 'capture': case 'ending':
            if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') this.skipCutscene();
            break;
          case 'playing':
            if (e.code === 'KeyE') this.interact();
            else if (e.code === 'Space') G.Player.jump();
            else if (e.code === 'KeyQ') this.useSelfie();
            else if (e.code === 'Tab' || e.code === 'KeyI') G.UI.bag();
            else if (e.code === 'KeyM') this.toggleSound();
            break;
          case 'paused':
            if (e.code === 'KeyR') this.restart();
            else if (e.code === 'KeyM') this.toggleSound();
            break;
          case 'gameover': case 'win':
            if (e.code === 'KeyR' || e.code === 'Enter') this.restart();
            break;
        }
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });

      document.addEventListener('mousemove', (e) => {
        if (this.state === 'playing' && document.pointerLockElement === this.renderer.domElement) G.Player.look(e.movementX, e.movementY);
      });
      document.addEventListener('mousedown', (e) => {
        if (this.state === 'playing' && e.button === 0 && document.pointerLockElement === this.renderer.domElement) this.interact();
      });
      document.addEventListener('pointerlockchange', () => {
        const locked = document.pointerLockElement === this.renderer.domElement;
        if (locked) {
          if (this.state === 'ready' || this.state === 'paused') {
            this.state = 'playing';
            G.UI.screen(null);
            G.Audio.setMusic(true);
          }
        } else if (this.state === 'playing') {
          this.pause();
        }
      });
    },

    bindUI() {
      document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
        if (b.disabled) return;
        this.difficulty = b.dataset.diff;
        document.querySelectorAll('[data-diff]').forEach((x) => x.classList.toggle('selected', x === b));
        this.renderDiffInfo();
        G.Audio.init(); G.Audio.play('click');
      }));
      $('btn-diff-start').onclick = () => this.startFromDifficulty();
      $('btn-diff-back').onclick = () => this.toTitle(false);
      document.querySelectorAll('[data-diff]').forEach((x) => x.classList.toggle('selected', x.dataset.diff === this.difficulty));
      const gsel = $('in-grade');
      gsel.innerHTML = '<option value="">학년</option>' + [1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}">${g}학년</option>`).join('');
      $('btn-start').onclick = () => this.openConsent();
      $('btn-agree').onclick = () => this.agree(true);
      $('btn-disagree').onclick = () => this.agree(false);
      $('btn-profile-ok').onclick = () => this.submitProfile();
      $('btn-profile-back').onclick = () => { this.state = 'start'; G.UI.screen('start-screen'); };
      $('skip-layer').onclick = () => this.skipCutscene();
      $('resume-screen').onclick = () => this.requestLock();
      $('btn-resume').onclick = () => this.requestLock();
      $('btn-sound').onclick = () => this.toggleSound();
      $('btn-restart').onclick = () => this.restart();
      $('btn-title').onclick = () => this.toTitle(true);
      $('btn-retry').onclick = () => this.restart();
      $('btn-title2').onclick = () => this.toTitle(true);
      $('btn-again').onclick = () => this.restart();
      $('btn-title3').onclick = () => this.toTitle(true);
    },
  };

  G.Game = Game;
  window.addEventListener('load', () => Game.init());
})();
