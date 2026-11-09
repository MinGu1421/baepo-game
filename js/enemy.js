// 술래 납치범 — "W를 가져가" 춤추면서 길찾기로 쫓아옴
(function () {
  const C = G.CONFIG, U = G.U;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  G.Enemy = {
    init(scene) {
      this.model = G.Models.kidnapper();
      scene.add(this.model.root);
      this.pos = new THREE.Vector3();
      this.reset();
    },

    reset() {
      this.frozen = 0;
      this.target = null;
      this.field = null;
      this.fieldTimer = 0;
      this.facing = 0;
      const r = this.model.root;
      r.visible = true; r.scale.set(1, 1, 1);
      G.Models.resetPose(this.model);
      this.model.marker.visible = false;
      this.model.label.visible = true;
    },

    setCell(x, z) {
      const c = G.World.center(x, z);
      this.pos.set(c.x, 0, c.z);
      this.target = null;
      this.sync();
    },

    computeField() {
      const pc = G.World.cellOf(G.Player.pos);
      this.field = G.World.bfs(pc.x, pc.z);
      this.fieldTimer = 0.2;
    },

    candidates(filter) {
      const W = G.World, out = [];
      this.computeField();
      for (let i = 0; i < this.field.length; i++) {
        const d = this.field[i];
        if (d < 0) continue;
        const c = W.cells[i];
        if (c.type !== 'floor' || c.ramp) continue;
        if (filter(c, d)) out.push(i);
      }
      return out;
    },

    // 플레이어에게서 먼 곳에 배치 (zone: 'house' | 'maze')
    placeFar(zone) {
      const W = G.World;
      let cand = this.candidates((c) => !zone || c.zone === zone);
      if (!cand.length) cand = this.candidates(() => true);
      if (!cand.length) return;
      let max = 0;
      cand.forEach((i) => { if (this.field[i] > max) max = this.field[i]; });
      const far = cand.filter((i) => this.field[i] >= max * 0.75);
      const i = U.pick(far.length ? far : cand);
      this.setCell(i % W.W, Math.floor(i / W.W));
    },

    placeNear(minD, maxD) {
      const W = G.World;
      let cand = this.candidates((c, d) => d >= minD && d <= maxD);
      if (!cand.length) cand = this.candidates((c, d) => d >= 2);
      if (!cand.length) return;
      const i = U.pick(cand);
      this.setCell(i % W.W, Math.floor(i / W.W));
    },

    update(dt, speed, catchUp) {
      let moving = false;
      if (this.frozen > 0) this.frozen -= dt;
      else moving = this.chase(dt, speed, catchUp);
      this.model.animate(dt, moving);
      this.sync();
    },

    chase(dt, speed, catchUp) {
      const W = G.World, P = G.Player.pos;
      this.fieldTimer -= dt;
      if (this.fieldTimer <= 0 || !this.field) this.computeField();
      const ec = W.cellOf(this.pos);
      let d = this.field[W.idx(ec.x, ec.z)];
      if (d < 0 || d === undefined) {
        // 상자 칸 가장자리 등에 걸쳐 있으면 옆 칸으로 빠져나옴 (순간이동/멈춤 없이)
        let best = null;
        for (const [dx, dz] of DIRS) {
          const nx = ec.x + dx, nz = ec.z + dz, nd = this.field[W.idx(nx, nz)];
          if (!W.cell(nx, nz).solid && nd >= 0 && (!best || nd < best.d)) best = { x: nx, z: nz, d: nd };
        }
        if (!best) { this.placeFar(); return false; }
        this.target = W.center(best.x, best.z);
        d = best.d + 1;
      }
      const sp = speed * (d > C.enemy.farPathCells ? catchUp : 1);

      if (d <= 1) { // 가까우면 직접 돌진
        this.target = null;
        const dx = P.x - this.pos.x, dz = P.z - this.pos.z, dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const s = Math.min(dist, sp * dt);
          W.moveCircle(this.pos, dx / dist * s, dz / dist * s, 0.3, true);
          this.face(dx, dz, dt);
        }
        return true;
      }

      if (!this.target) {
        let best = null, bestD = d;
        for (const [dx, dz] of DIRS) {
          const nx = ec.x + dx, nz = ec.z + dz;
          if (W.cell(nx, nz).solid) continue;
          const nd = this.field[W.idx(nx, nz)];
          if (nd >= 0 && nd < bestD) { bestD = nd; best = { x: nx, z: nz }; }
        }
        if (!best) return false;
        this.target = W.center(best.x, best.z);
      }

      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      const s = Math.min(dist, sp * dt);
      if (dist > 1e-4) {
        this.pos.x += dx / dist * s; this.pos.z += dz / dist * s;
        this.face(dx, dz, dt);
      }
      if (dist - s < 0.02) this.target = null;
      return true;
    },

    face(dx, dz, dt) {
      const target = Math.atan2(dx, dz);
      let diff = target - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 10);
    },

    sync() {
      this.pos.y = G.World.groundAt(this.pos.x, this.pos.z);
      // 통나무 위를 지날 땐 폴짝 뛰어넘는 모습
      const c = G.World.cellAt(this.pos.x, this.pos.z);
      if (c.hurdle) {
        const S = G.CONFIG.cellSize, f = c.hurdle.alongX ? (this.pos.x / S - c.x) : (this.pos.z / S - c.z);
        this.pos.y += Math.sin(Math.min(1, Math.max(0, f)) * Math.PI) * 0.9;
      }
      this.model.root.position.copy(this.pos);
      this.model.root.rotation.y = this.facing;
    },
  };
})();
