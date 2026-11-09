// 컷신: 시작(쫄라맨 납치) / 게임오버(납치범이 머리를 잡고 집으로 끌고 감)
(function () {
  const U = G.U, M = () => G.Models;

  const SCENES = {
    // 마당에서 W를 가져가를 추던 쫄라맨을 납치범이 뒤에서 머리를 잡아 쓰러뜨림
    intro: {
      dur: 9.6,
      setup(cs) {
        const Y = G.Rooms.yard;
        const c = G.World.center(Math.round((Y.x0 + Y.x1) / 2), Math.round((Y.z0 + Y.z1) / 2));
        cs.c = c;
        const Z = cs.zola;
        M().resetPose(Z);
        Z.inner.rotation.set(0, 0, 0);
        Z.root.position.set(c.x, 0, c.z);
        Z.root.rotation.y = -Math.PI / 2; // 카메라(서쪽)를 바라봄
        Z.root.visible = true;
        const E = G.Enemy;
        E.reset();
        E.model.label.visible = false;
        E.pos.set(c.x + 6, 0, c.z); E.facing = -Math.PI / 2; E.sync();
        cs.camPos = new THREE.Vector3(c.x - 4.6, 2.1, c.z + 2.4);
        cs.look = new THREE.Vector3(c.x + 0.8, 1.2, c.z);
        G.UI.subtitle('♪ 오늘도 신나게 W를 가져가~ ♪');
      },
      update(cs, t, dt) {
        const Z = cs.zola, E = G.Enemy, en = E.model, c = cs.c;
        if (t < 5.0) Z.animate(dt, false);
        // 납치범이 살금살금 다가옴
        const p = U.clamp((t - 1.2) / 3.6, 0, 1);
        E.pos.x = c.x + 6 - p * 5.25;
        E.sync();
        if (t < 5.0) {
          M().dance(en, dt * 0.5, p > 0 && p < 1);
          en.hips.rotation.y = 0; en.hips.position.x = 0;
          en.armL.rotation.set(-0.9, 0, -0.3); en.armR.rotation.set(-0.9, 0, 0.3);
        }
        if (t >= 2.6 && cs.once('who')) G.UI.subtitle('...그런데 뒤에서 누군가 다가온다?!');
        if (t >= 5.0) {
          if (cs.once('grab')) {
            G.UI.subtitle('납치범: 잡았다~!! 🖐️');
            G.Audio.play('grab');
            cs.shake = 0.5;
            M().resetPose(Z);
          }
          en.armL.rotation.set(-2.5, 0, -0.15); en.armR.rotation.set(-2.5, 0, 0.15);
          en.hips.rotation.y = 0;
          // 머리 잡혀서 버둥버둥 → 뒤로 쓰러짐
          const f = U.clamp((t - 5.8) / 0.8, 0, 1);
          Z.inner.rotation.x = -U.easeInOut(f) * Math.PI / 2;
          Z.inner.position.y = f * 0.15;
          const flail = f < 1 ? Math.sin(t * 30) * 0.8 : 0;
          Z.armL.rotation.z = -1 + flail; Z.armR.rotation.z = 1 - flail;
          Z.legL.rotation.x = flail * 0.5; Z.legR.rotation.x = -flail * 0.5;
        }
        if (t >= 6.4 && cs.once('faint')) { G.UI.subtitle('쫄라맨: 으앗...! 💫'); cs.shake = 0.3; }
        if (t >= 7.2 && cs.once('fade')) { G.UI.fadeIn('#000', 1.2); G.UI.subtitle('쫄라맨은 납치범의 집 2층 침실에 갇히고 말았다...'); }

        const cam = G.Player.camera;
        cam.position.copy(cs.camPos);
        cam.position.x += Math.min(t, 5) * 0.12;
        if (cs.shake > 0) { cam.position.x += (Math.random() - 0.5) * cs.shake; cam.position.y += (Math.random() - 0.5) * cs.shake; }
        cam.lookAt(cs.look);
      },
    },

    // 게임오버: 납치범이 쫄라맨 머리를 잡고 집(부엌 문)으로 들어감
    capture: {
      dur: 8,
      setup(cs, opts) {
        const W = G.World, R = G.Rooms;
        const front = W.doors.find((d) => d.front);
        cs.front = front;
        const door = W.center(front.x, front.z);
        cs.door = door;
        cs.startX = W.center(R.yard.x1 - 1, front.z).x;
        cs.endX = door.x - 6;
        const Z = cs.zola;
        M().resetPose(Z);
        Z.inner.rotation.set(-0.3, 0, 0);
        Z.root.visible = true;
        const E = G.Enemy;
        E.reset();
        E.model.label.visible = false;
        E.pos.set(cs.startX, 0, door.z); E.facing = -Math.PI / 2; E.sync();
        cs.camPos = new THREE.Vector3(door.x + 7.5, 2.8, door.z + 5.5);
        G.UI.subtitle(opts.reason === 'time' ? `⏰ ${Math.round(G.CONFIG.timeLimit / 60)}분 안에 탈출하지 못했다...` : '💔 목숨을 모두 잃었다...');
      },
      update(cs, t, dt) {
        const Z = cs.zola, E = G.Enemy, en = E.model;
        if (t >= 0.6 && cs.once('door') && cs.front.locked) { G.World.openDoor(cs.front); G.Audio.play('door'); }
        if (t >= 1.6 && cs.once('say')) { G.UI.subtitle('납치범: 집으로 돌아가자~ ♪ W를 가져가~'); G.Audio.play('grab'); }
        const walk = t > 1.2;
        E.pos.x = Math.max(cs.endX, cs.startX - Math.max(0, t - 1.2) * 2.6);
        E.sync();
        M().dance(en, dt, walk);
        en.hips.rotation.set(0, 0, 0); en.hips.position.x = 0;
        en.armR.rotation.set(-1.45, 0, 0.1);           // 오른손으로 머리 잡기
        en.armL.rotation.set(Math.sin(t * 8) * 0.6, 0, -0.5 - Math.abs(Math.sin(t * 4)) * 0.8); // 왼손은 신나게 흔들기
        // 쫄라맨: 머리가 납치범 손에 잡혀 질질 끌려감
        const hand = en.hips.position.y + 0.75;
        Z.root.position.set(E.pos.x - 0.95, E.pos.y + hand - 1.72, E.pos.z);
        Z.root.rotation.y = -Math.PI / 2;
        const sw = Math.sin(t * 9);
        Z.armL.rotation.z = -0.8 + sw * 0.5; Z.armR.rotation.z = 0.8 - sw * 0.5;
        Z.legL.rotation.x = sw * 0.6; Z.legR.rotation.x = -sw * 0.6;
        if (t >= 5.0 && cs.once('fade')) { G.UI.fadeIn('#000', 1.4); G.UI.subtitle('쫄라맨은 다시 집에 갇히고 말았다...'); }
        const cam = G.Player.camera;
        cam.position.copy(cs.camPos);
        cam.lookAt(E.pos.x - 0.5, 1.3, E.pos.z);
      },
    },
  };

  G.Cutscene = {
    active: null,
    init(scene) {
      this.zola = G.Models.zola();
      this.zola.root.visible = false;
      scene.add(this.zola.root);
    },
    start(name, opts, onDone) {
      const flags = {};
      const cs = this.cs = {
        zola: this.zola, shake: 0, t: 0,
        once: (k) => (flags[k] ? false : (flags[k] = true)),
      };
      this.active = SCENES[name];
      this.onDone = onDone;
      G.Player.hands.group.visible = false;
      G.Player.shadow.visible = false;
      this.active.setup(cs, opts || {});
    },
    update(dt) {
      if (!this.active) return;
      const cs = this.cs;
      cs.t += dt;
      cs.shake = Math.max(0, cs.shake - dt);
      this.active.update(cs, cs.t, dt);
      if (cs.t >= this.active.dur) this.finish();
    },
    finish() {
      if (!this.active) return;
      this.active = null;
      this.zola.root.visible = false;
      G.UI.subtitle(null);
      const cb = this.onDone; this.onDone = null;
      if (cb) cb();
    },
  };
})();
