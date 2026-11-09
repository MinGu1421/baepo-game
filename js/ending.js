// 엔딩 컷신: 노스니 부활 → 납치범 등장 → 대결 → 망치로 퇴치 → 미로 부수고 탈출
(function () {
  const U = G.U;

  G.Ending = {
    active: false,
    particles: [],

    reset() {
      this.active = false;
      this.particles = [];
    },

    start(game) {
      this.game = game;
      this.active = true;
      this.t = 0; this.flags = {}; this.shake = 0; this.hitCd = 0; this.boomT = 0;
      const N = G.World.nosni;
      this.N = N.model;
      const d = this.d = { x: N.dir.x, z: N.dir.z };
      this.P = new THREE.Vector3(N.x, 0, N.z);
      this.E = new THREE.Vector3(N.x - d.x * 4.5, 0, N.z - d.z * 4.5);
      this.perp = { x: -d.z, z: d.x };
      this.M = new THREE.Vector3(N.x - d.x * 2.25, 0, N.z - d.z * 2.25);
      this.camBase = new THREE.Vector3(this.M.x + this.perp.x * 5.2, 4.6, this.M.z + this.perp.z * 5.2);
      if (N.label) N.label.visible = false;

      // 심장의 힘으로 주변 미로 벽이 낮아져 대결 무대가 열림
      G.World.mazeWalls.forEach((m) => {
        const dx = m.position.x - this.M.x, dz = m.position.z - this.M.z;
        const near = Math.hypot(dx, dz) < 7.5;
        const toCam = (dx * this.perp.x + dz * this.perp.z) > 0 && Math.hypot(dx, dz) < 11;
        if (!near && !toCam) return;
        const h0 = m.scale.y;
        G.Fx.add(0.8, (p) => {
          const s = 1 - U.easeInOut(p) * 0.92;
          m.scale.y = h0 * s; m.position.y = h0 * s / 2;
        });
      });

      G.Player.hands.group.visible = false;
      G.Player.shadow.visible = false;
      const en = G.Enemy;
      en.model.root.visible = false;
      en.model.marker.visible = false;
      en.model.root.scale.setScalar(0.001);
      en.pos.copy(this.E);
      en.facing = Math.atan2(d.x, d.z);
      en.sync();

      G.UI.subtitle('노스니에게 심장을 주었다...');
      G.Audio.setDanger(0.1);
    },

    update(dt) {
      if (!this.active) return;
      this.t += dt;
      const t = this.t, f = this.flags, N = this.N, en = G.Enemy, d = this.d;
      const once = (k) => (f[k] ? false : (f[k] = true));
      let nOff = 0, eOff = 0;
      this.hitCd = Math.max(0, this.hitCd - dt);

      // 1) 노스니 부활
      if (t >= 0.5 && t <= 2.7) {
        const p = U.easeInOut(U.clamp((t - 0.5) / 2, 0, 1));
        N.inner.rotation.x = -Math.PI / 2 * (1 - p);
        N.inner.position.set(0, 0.55 * (1 - p), 1 - p);
        if (p > 0.4 && once('rev')) { N.setRevived(true); G.Audio.play('success'); G.UI.subtitle('❤️ 노스니가 깨어났다!'); }
      }

      // 2) 납치범 등장
      if (t >= 3.0) {
        if (once('enemy')) { en.model.root.visible = true; G.UI.subtitle('납치범: ♪ W를 가져가~ W를 가져가~ ♪'); G.Audio.setDanger(1); }
        if (!f.dead) en.model.root.scale.setScalar(Math.max(0.001, U.easeOutCubic(U.clamp((t - 3) / 0.6, 0, 1))));
      }

      // 3) 대결
      if (t >= 4.8 && t < 7.2) {
        if (once('fight')) G.UI.subtitle('⚔️ 노스니와 납치범의 대결!');
        const s = Math.abs(Math.sin((t - 4.8) * Math.PI / 0.6));
        nOff = s * 1.3; eOff = s * 1.3;
        if (s > 0.95 && this.hitCd <= 0) { this.hitCd = 0.3; this.shake = 0.25; G.Audio.play('hit'); }
        N.armL.rotation.x = -s * 2; N.armR.rotation.x = -s * 1.5;
      }

      // 4) 망치 꺼내기
      if (t >= 7.2 && t < 8.6) {
        if (once('hammer')) { G.UI.subtitle('🔨 노스니가 망치를 꺼냈다!'); G.Audio.play('pickup'); }
        const p = U.clamp((t - 7.2) / 0.6, 0, 1);
        N.hammer.scale.setScalar(Math.max(0.001, U.easeOutCubic(p) + Math.sin(p * Math.PI) * 0.3));
        N.armR.rotation.x += (-Math.PI * 0.95 - N.armR.rotation.x) * Math.min(1, dt * 8);
        N.armL.rotation.x *= 0.9;
        nOff = U.easeInOut(U.clamp((t - 7.6) / 0.9, 0, 1)) * 2.6;
      }

      // 5) 내려치기 → 퇴치
      if (t >= 8.6 && t < 10.3) {
        nOff = 2.6;
        const p = U.clamp((t - 8.6) / 0.22, 0, 1);
        N.armR.rotation.x = U.lerp(-Math.PI * 0.95, -Math.PI * 0.5, U.easeOutCubic(p));
        if (p >= 1 && once('impact')) {
          f.dead = true;
          this.shake = 0.7;
          G.Audio.play('boom');
          G.UI.subtitle('💥 쾅!! 납치범 퇴치!');
          G.UI.flash('rgba(255,255,255,0.85)', 0.5);
          this.burst(this.E);
          G.Audio.setDanger(0.1);
        }
      }
      if (f.dead && t < 15.2) {
        const q = U.clamp((t - 8.85) / 1.2, 0, 1);
        const sx = 1.5 * (1 - q * 0.9) + 0.001;
        en.model.root.scale.set(sx, Math.max(0.05, 0.12 * (1 - q)), sx);
        if (q >= 1) en.model.root.visible = false;
      }

      // 6) 미로 부수기
      if (t >= 10.3) {
        if (once('break')) { G.UI.subtitle('🔨 노스니가 미로를 부순다!! 탈출이다!'); this.prepWalls(); }
        nOff = 2.6;
        const tt = t - 10.3;
        N.armR.rotation.x = -Math.PI * 0.5 - Math.abs(Math.sin(tt * 6)) * 1.3;
        this.boomT -= dt;
        if (this.boomT <= 0 && tt < 3) { this.boomT = 0.5; this.shake = Math.max(this.shake, 0.3); G.Audio.play('door'); }
        this.updateWalls(dt, tt);
      }

      // 7) 하얗게 사라지며 탈출
      if (t >= 13.6 && once('fade')) G.UI.fadeIn('#ffffff', 1.5);
      // 8) 탈출 성공 장면: 쫄라맨은 W를 가져가 춤, 납치범은 뒤에서 머리 감싸고 바닥 짚으며 아쉬워함
      if (t >= 15.2) { this.finale(dt, t - 15.2, once); return; }

      // 위치/애니메이션
      N.root.position.set(this.P.x - d.x * nOff, 0, this.P.z - d.z * nOff);
      if (f.rev) N.hips.position.y = 0.85 + Math.abs(Math.sin(t * 4)) * 0.04;
      en.pos.set(this.E.x + d.x * eOff, 0, this.E.z + d.z * eOff);
      en.sync();
      if (!f.dead) en.model.animate(dt, false);
      this.updateParticles(dt);

      // 카메라
      this.shake = Math.max(0, this.shake - dt);
      const cam = G.Player.camera;
      const rise = t > 10.3 ? U.easeInOut(U.clamp((t - 10.3) / 3.5, 0, 1)) : 0;
      cam.position.copy(this.camBase);
      cam.position.y += rise * 8;
      cam.position.x += this.perp.x * rise * 4;
      cam.position.z += this.perp.z * rise * 4;
      if (this.shake > 0) {
        cam.position.x += (Math.random() - 0.5) * this.shake;
        cam.position.y += (Math.random() - 0.5) * this.shake;
      }
      cam.lookAt(this.M.x, 1.0, this.M.z);
    },

    finale(dt, ft, once) {
      const N = this.N, en = G.Enemy, Z = G.Cutscene.zola, d = this.d, p = this.perp;
      const F = { x: this.P.x - d.x * 3, z: this.P.z - d.z * 3 };
      const faceCam = Math.atan2(p.x, p.z);
      if (once('finale')) {
        G.World.mazeWalls.forEach((m) => { m.visible = false; });
        G.UI.clearFlash(); G.UI.flash('#ffffff', 1.2);
        G.UI.subtitle('🎉 미로 탈출 성공!');
        G.Audio.setChase(false);
        G.Models.resetPose(Z); Z.inner.rotation.set(0, 0, 0); Z.inner.position.set(0, 0, 0);
        Z.root.visible = true;
        Z.root.position.set(F.x, 0, F.z); Z.root.rotation.y = faceCam;
        en.model.root.visible = true; en.model.root.scale.set(1, 1, 1);
        en.model.label.visible = false;
        G.Models.resetPose(en.model);
        en.model.setMood('sad');
        en.pos.set(F.x - p.x * 1.5 - d.x * 1.2, 0, F.z - p.z * 1.5 - d.z * 1.2); en.facing = faceCam; en.sync();
        N.root.position.set(F.x + d.x * 1.8, 0, F.z + d.z * 1.8); N.root.rotation.y = faceCam;
        N.hammer.scale.setScalar(0.001);
        N.t = 0; N.baseY = 0.85;
      }
      if (ft >= 1.6 && once('zsay')) G.UI.subtitle('쫄라맨: ♪ W를 가져가~ W를 가져가~ ♪');
      if (ft >= 4.2 && once('ksay')) G.UI.subtitle('납치범: 아... 아쉽다... 😭');
      Z.animate(dt, false);
      G.Models.dance(N, dt, false);
      en.model.sadPose(ft);
      const cam = G.Player.camera;
      cam.position.set(F.x + p.x * 5.5 + d.x * 0.6, 2.3, F.z + p.z * 5.5 + d.z * 0.6);
      cam.lookAt(F.x - p.x * 0.6, 1.0, F.z - p.z * 0.6);
      if (ft >= 7.2 && once('end')) this.skip();
    },

    skip() {
      if (!this.active) return;
      this.active = false;
      G.UI.subtitle(null);
      G.UI.clearFlash();
      this.game.win();
    },

    prepWalls() {
      this.walls = G.World.mazeWalls.map((m) => {
        const dx = m.position.x - this.P.x, dz = m.position.z - this.P.z, dist = Math.hypot(dx, dz) || 1;
        const sp = U.rand(5, 10);
        return {
          m, delay: dist / 14,
          v: new THREE.Vector3(dx / dist * sp, U.rand(7, 12), dz / dist * sp),
          spin: new THREE.Vector3(U.rand(-4, 4), U.rand(-4, 4), U.rand(-4, 4)),
        };
      });
    },

    updateWalls(dt, tt) {
      (this.walls || []).forEach((w) => {
        if (tt < w.delay || !w.m.visible) return;
        w.v.y -= 25 * dt;
        w.m.position.addScaledVector(w.v, dt);
        w.m.rotation.x += w.spin.x * dt; w.m.rotation.y += w.spin.y * dt; w.m.rotation.z += w.spin.z * dt;
        if (w.m.position.y < -6) w.m.visible = false;
      });
    },

    burst(pos) {
      for (let i = 0; i < 16; i++) {
        const s = U.makeLabel(U.pick(['⭐', '✨', '💫']), { bg: null, height: 0.6, font: 'bold 56px sans-serif' });
        s.position.set(pos.x, 1.2, pos.z);
        G.World.root.add(s);
        this.particles.push({ s, v: new THREE.Vector3(U.rand(-5, 5), U.rand(4, 9), U.rand(-5, 5)), life: 0 });
      }
    },

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        p.v.y -= 12 * dt;
        p.s.position.addScaledVector(p.v, dt);
        p.s.material.opacity = Math.max(0, 1 - p.life / 1.4);
        if (p.life > 1.4) { G.World.root.remove(p.s); this.particles.splice(i, 1); }
      }
    },
  };
})();
