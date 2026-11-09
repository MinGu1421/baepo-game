// 맵 전체(2층 집 + 계단 + 1층 + 마당 + 미로)를 칸(grid) 단위로 만들고 3D로 그립니다.
(function () {
  const C = G.CONFIG, U = G.U;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const FULL = [0, 1, 0, 1];
  // 가구 높이 (점프로 넘을 수 있는지 결정). 상자·오락기·나무는 못 넘음
  const DECOR_H = { bed: 0.65, lamp: 1.3, table: 0.85, plant: 1.6, tree: Infinity, tv: 1.5, sofa: 0.95, toilet: 1.0,
    tub: 0.6, sink: 1.0, fridge: 1.9, stove: 0.95, counter: 0.96, shoes: 0.62 };
  const HURDLE_H = 0.55;
  const STEP = 0.15; // 이 정도 높이 차이까지는 올라설 수 있음
  const VOID = { type: 'void', solid: true, zone: null, room: null, floorY: 0 };

  function noise(ctx, w, h, n, color) {
    for (let i = 0; i < n; i++) { ctx.fillStyle = color(); ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  }

  function floorTexture(kind) {
    const tex = U.canvasTexture(128, 128, (ctx, w, h) => {
      switch (kind) {
        case 'carpet':
          ctx.fillStyle = '#b8869b'; ctx.fillRect(0, 0, w, h);
          noise(ctx, w, h, 500, () => `rgba(255,255,255,${Math.random() * 0.1})`); break;
        case 'wood':
          for (let y = 0; y < h; y += 32) {
            ctx.fillStyle = (y / 32) % 2 ? '#94653a' : '#a87a48'; ctx.fillRect(0, y, w, 30);
            ctx.fillStyle = '#6b4423'; ctx.fillRect(0, y + 30, w, 2); ctx.fillRect(((y / 32) % 2) * 64 + 20, y, 2, 32);
          } break;
        case 'tile':
          ctx.fillStyle = '#e0f2fe'; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
          for (let i = 0; i <= w; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
          break;
        case 'checker':
          for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { ctx.fillStyle = ((x + y) / 32) % 2 ? '#334155' : '#f8fafc'; ctx.fillRect(x, y, 32, 32); }
          break;
        case 'stone':
          ctx.fillStyle = '#8b8378'; ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 42) for (let x = 0; x < w; x += 64) { ctx.fillStyle = `hsl(30,8%,${45 + Math.random() * 12}%)`; ctx.fillRect(x + 2 + (y % 84 ? 32 : 0), y + 2, 60, 38); }
          break;
        case 'grass':
          ctx.fillStyle = '#3f6b2a'; ctx.fillRect(0, 0, w, h);
          noise(ctx, w, h, 700, () => `hsl(${95 + Math.random() * 30},45%,${22 + Math.random() * 18}%)`); break;
        default:
          ctx.fillStyle = '#a0703f'; ctx.fillRect(0, 0, w, h);
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function wallTexture() {
    return U.canvasTexture(128, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f3e8d0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e6d5ae'; for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 10, h);
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(0, h - 8, w, 8);
    });
  }

  function hedgeTexture() {
    return U.canvasTexture(128, 192, (ctx, w, h) => {
      ctx.fillStyle = '#1f5f2a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `hsl(${105 + Math.random() * 30},${45 + Math.random() * 20}%,${18 + Math.random() * 22}%)`;
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 7, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  const World = {
    idx(x, z) { return z * this.W + x; },
    cell(x, z) { return (x < 0 || z < 0 || x >= this.W || z >= this.H) ? VOID : this.cells[z * this.W + x]; },
    isSolid(x, z) { return this.cell(x, z).solid; },
    cellOf(p) { const S = C.cellSize; return { x: Math.floor(p.x / S), z: Math.floor(p.z / S) }; },
    cellAt(px, pz) { const S = C.cellSize; return this.cell(Math.floor(px / S), Math.floor(pz / S)); },
    center(x, z) { const S = C.cellSize; return { x: (x + 0.5) * S, z: (z + 0.5) * S }; },

    // 그 위치의 바닥 높이 (계단은 경사)
    groundAt(px, pz) {
      const c = this.cellAt(px, pz);
      if (c.ramp) {
        const st = G.Rooms.stairs, S = C.cellSize;
        const t = U.clamp((pz / S - st.z0) / (st.z1 + 1 - st.z0), 0, 1);
        return C.floor2Height * (1 - t);
      }
      return c.floorY || 0;
    },

    build(scene) {
      if (this.root) {
        scene.remove(this.root);
        this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
      this.root = new THREE.Group();
      scene.add(this.root);

      const R = G.Rooms, F2 = C.floor2Height;
      const mz = this.mz = G.Maze.generate(C.maze.cols, C.maze.rows, C.maze.extraOpenings); // 매 판 새 미로
      const MX = R.maze.x, MZ = R.maze.z;
      this.W = Math.max(...R.list.map((r) => r.x1 + 2), R.yard.x1 + 2, MX + mz.W);
      this.H = Math.max(...R.list.map((r) => r.z1 + 2), R.yard.z1 + 2, MZ + mz.H);

      this.cells = new Array(this.W * this.H);
      for (let z = 0; z < this.H; z++) for (let x = 0; x < this.W; x++) {
        this.cells[z * this.W + x] = { x, z, solid: true, type: 'void', zone: null, room: null, floorY: 0, box: null };
      }
      const setFloor = (c, room, zone, y) => { c.type = 'floor'; c.solid = false; c.room = room; c.zone = zone; c.floorY = y; };

      // 방 바닥
      R.list.forEach((r) => {
        const y = r.level === 2 ? F2 : 0;
        for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) setFloor(this.cell(x, z), r.id, 'house', y);
      });
      // 계단 (경사)
      const st = R.stairs;
      for (let z = st.z0; z <= st.z1; z++) {
        const c = this.cell(st.x, z);
        setFloor(c, 'stairs', 'house', F2 * (1 - (z - st.z0) / (st.z1 + 1 - st.z0)));
        c.ramp = true;
      }
      // 마당
      for (let x = R.yard.x0; x <= R.yard.x1; x++) for (let z = R.yard.z0; z <= R.yard.z1; z++) setFloor(this.cell(x, z), 'yard', 'maze', 0);
      // 미로
      for (let z = 0; z < mz.H; z++) for (let x = 0; x < mz.W; x++) {
        const c = this.cell(MX + x, MZ + z);
        if (mz.grid[z][x]) { c.type = 'mwall'; c.zone = 'maze'; }
        else setFloor(c, 'maze', 'maze', 0);
      }
      const [ysx, ysz] = R.yardSpawn;
      for (let k = 0; k < 2; k++) setFloor(this.cell(MX + k, ysz), 'maze', 'maze', 0);

      // 문
      this.doors = R.doors.map((d) => {
        const c = this.cell(d.x, d.z);
        const room = R.byId[d.room];
        c.type = 'door'; c.solid = true; c.zone = 'house';
        c.floorY = room.level === 2 ? F2 : 0;
        c.box = d.axis === 'x' ? [0.42, 0.58, 0, 1] : [0, 1, 0.42, 0.58];
        return Object.assign({}, d, { cell: c, locked: true });
      });

      // 바깥벽: 집 바닥 옆 빈칸 = 벽, 마당 옆 빈칸 = 생울타리
      const isHouse = (c) => c.zone === 'house' && (c.type === 'floor' || c.type === 'door');
      const isYard = (c) => c.room === 'yard';
      for (const c of this.cells) {
        if (c.type !== 'void') continue;
        let house = false, yard = false;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const n = this.cell(c.x + dx, c.z + dz);
          if (isHouse(n)) house = true; else if (isYard(n)) yard = true;
        }
        if (house) { c.type = 'wall'; c.zone = 'house'; }
        else if (yard) { c.type = 'mwall'; c.zone = 'maze'; }
      }

      // 미로 끝(입구에서 가장 먼 칸)과 막다른 길
      this.yardStart = { x: ysx, z: ysz };
      this.spawn = { x: R.spawn[0], z: R.spawn[1] };
      const dist = this.bfs(MX + 1, ysz);
      let end = null, endD = -1;
      const deadEnds = [];
      for (let z = 1; z < mz.H; z += 2) for (let x = 1; x < mz.W; x += 2) {
        const gx = MX + x, gz = MZ + z, d = dist[this.idx(gx, gz)];
        if (d < 0) continue;
        if (d > endD) { endD = d; end = { x: gx, z: gz }; }
        let open = 0;
        DIRS.forEach(([dx, dz]) => { if (!this.isSolid(gx + dx, gz + dz)) open++; });
        if (open === 1) deadEnds.push({ x: gx, z: gz, d });
      }
      let nos = null;
      DIRS.forEach(([dx, dz]) => {
        const nx = end.x + dx, nz = end.z + dz;
        if (!this.isSolid(nx, nz) && dist[this.idx(nx, nz)] === endD - 1) nos = { x: nx, z: nz };
      });

      // 소품 (작은 충돌 상자)
      const pb = (1 - C.propHitbox) / 2, propBox = [pb, 1 - pb, pb, 1 - pb];
      const prop = (x, z, h) => { const c = this.cell(x, z); c.type = 'prop'; c.solid = true; c.box = propBox; c.h = h === undefined ? Infinity : h; };
      this.chests = [];
      const addChest = (x, z, content, room, kind) => { prop(x, z, Infinity); this.chests.push({ x, z, content, room, kind: kind || 'normal', opened: false }); };
      R.list.forEach((r) => {
        const items = U.shuffle((C.chests[r.id] || []).slice());
        (r.chests || []).forEach((p, i) => { if (i < items.length) addChest(p[0], p[1], items[i], r.id); });
      });
      addChest(end.x, end.z, 'heart', 'maze', 'heart');
      const mazeItems = (C.chests.maze || []).slice();
      U.shuffle(deadEnds.filter((e) => !(e.x === end.x && e.z === end.z) && e.d >= 6))
        .slice(0, mazeItems.length)
        .forEach((e, i) => addChest(e.x, e.z, mazeItems[i], 'maze'));

      this.stations = [];
      this.decor = [];
      R.list.forEach((r) => {
        if (r.station) { prop(r.station[0], r.station[1]); this.stations.push({ room: r.id, game: r.minigame, part: r.part, x: r.station[0], z: r.station[1], cleared: false }); }
        (r.decor || []).forEach((d) => { prop(d.x, d.z, DECOR_H[d.type]); this.decor.push(d); });
      });
      (R.yard.decor || []).forEach((d) => { prop(d.x, d.z, DECOR_H[d.type]); this.decor.push(d); });

      // 미로 통나무 장애물 (점프로 넘기) — 길찾기는 막지 않음
      this.hurdles = [];
      const open = (x, z) => !this.isSolid(x, z);
      const cand = [];
      for (const c of this.cells) {
        if (c.room !== 'maze' || c.type !== 'floor') continue;
        if ((c.x === nos.x && c.z === nos.z) || dist[this.idx(c.x, c.z)] < 5) continue;
        const ew = open(c.x - 1, c.z) && open(c.x + 1, c.z) && !open(c.x, c.z - 1) && !open(c.x, c.z + 1);
        const ns = open(c.x, c.z - 1) && open(c.x, c.z + 1) && !open(c.x - 1, c.z) && !open(c.x + 1, c.z);
        if (ew || ns) cand.push({ c, alongX: ew });
      }
      U.shuffle(cand).slice(0, C.mazeHurdles).forEach(({ c, alongX }) => {
        c.hurdle = { h: HURDLE_H, alongX, box: alongX ? [0.38, 0.62, 0, 1] : [0, 1, 0.38, 0.62] };
        this.hurdles.push(c);
      });

      // 미로 벽은 얇게 → 길이 넓어짐 (이웃 벽 쪽으로만 이어짐)
      const t = C.mazeWallThickness, a = (1 - t) / 2;
      const wallish = (c) => c.type === 'mwall' || c.type === 'wall' || c.type === 'void';
      for (const c of this.cells) {
        if (c.type !== 'mwall') continue;
        c.box = [
          wallish(this.cell(c.x - 1, c.z)) ? 0 : a, wallish(this.cell(c.x + 1, c.z)) ? 1 : 1 - a,
          wallish(this.cell(c.x, c.z - 1)) ? 0 : a, wallish(this.cell(c.x, c.z + 1)) ? 1 : 1 - a,
        ];
      }

      const S = C.cellSize;
      this.nosni = { x: (nos.x + 0.5) * S, z: (nos.z + 0.5) * S, dir: { x: end.x - nos.x, z: end.z - nos.z }, assembled: false, revived: false };
      this.buildMeshes();
    },

    hasOpenNeighbor(x, z) {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const t = this.cell(x + dx, z + dz).type;
        if (t === 'floor' || t === 'prop' || t === 'door') return true;
      }
      return false;
    },
    maxNeighborFloor(x, z) {
      let m = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, this.cell(x + dx, z + dz).floorY || 0);
      return m;
    },

    facing(x, z) {
      let best = null;
      for (const [dx, dz] of DIRS) {
        const f = this.cell(x + dx, z + dz).type, b = this.cell(x - dx, z - dz).type;
        if (f === 'floor' && (b === 'wall' || b === 'mwall' || b === 'void')) { best = [dx, dz]; break; }
      }
      if (!best) for (const [dx, dz] of DIRS) if (this.cell(x + dx, z + dz).type === 'floor') { best = [dx, dz]; break; }
      if (!best) best = [0, 1];
      return Math.atan2(best[0], best[1]);
    },

    buildMeshes() {
      const S = C.cellSize, WH = C.wallHeight, F2 = C.floor2Height, root = this.root, R = G.Rooms, M = G.Models;
      const mz = this.mz;
      const unit = new THREE.BoxGeometry(1, 1, 1);

      // 벽
      const houseWall = new THREE.MeshLambertMaterial({ map: wallTexture() });
      const hedge = new THREE.MeshLambertMaterial({ map: hedgeTexture() });
      this.mazeWalls = [];
      for (const c of this.cells) {
        if (c.type !== 'wall' && c.type !== 'mwall') continue;
        if (!this.hasOpenNeighbor(c.x, c.z)) continue;
        const b = c.box || FULL;
        const top = c.type === 'wall' ? this.maxNeighborFloor(c.x, c.z) + WH : C.mazeWallHeight;
        const m = new THREE.Mesh(unit, c.type === 'wall' ? houseWall : hedge);
        m.scale.set((b[1] - b[0]) * S, top, (b[3] - b[2]) * S);
        m.position.set((c.x + (b[0] + b[1]) / 2) * S, top / 2, (c.z + (b[2] + b[3]) / 2) * S);
        root.add(m);
        if (c.type === 'mwall') this.mazeWalls.push(m);
      }

      // 방 바닥 + 천장 + 조명
      const ceilMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e6, emissive: 0x6b6458, side: THREE.DoubleSide });
      R.list.forEach((r) => {
        const y = r.level === 2 ? F2 : 0;
        const w = (r.x1 - r.x0 + 1) * S, d = (r.z1 - r.z0 + 1) * S;
        const cx = r.x0 * S + w / 2, cz = r.z0 * S + d / 2;
        const tex = floorTexture(r.floor); tex.repeat.set(w / 2, d / 2);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(cx, y + 0.001, cz); root.add(floor);
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
        ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, y + WH, cz); root.add(ceil);
        const light = new THREE.PointLight(r.light, 0.9, 20, 1.2);
        light.position.set(cx, y + WH - 0.4, cz); root.add(light);
        const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
        lamp.rotation.x = Math.PI / 2; lamp.position.set(cx, y + WH - 0.02, cz); root.add(lamp);
      });
      const doorFloorTex = floorTexture('wood');
      this.doors.forEach((dr) => {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshLambertMaterial({ map: doorFloorTex }));
        f.rotation.x = -Math.PI / 2; f.position.set((dr.x + 0.5) * S, dr.cell.floorY + 0.001, (dr.z + 0.5) * S); root.add(f);
      });

      // 계단 (계단 모양은 보기용, 실제로는 경사로)
      const st = R.stairs, n = (st.z1 - st.z0 + 1) * 2, stepD = S / 2;
      const stepMat = new THREE.MeshLambertMaterial({ color: 0xa0784f });
      for (let i = 0; i < n; i++) {
        const h = F2 * (1 - (i + 0.5) / n) + 0.05;
        const s = new THREE.Mesh(unit, stepMat);
        s.scale.set(S, h, stepD);
        s.position.set((st.x + 0.5) * S, h / 2, st.z0 * S + (i + 0.5) * stepD);
        root.add(s);
      }
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(S, (st.z1 - st.z0 + 1) * S), ceilMat);
      sc.rotation.x = Math.PI / 2; sc.position.set((st.x + 0.5) * S, F2 + WH, (st.z0 + (st.z1 - st.z0 + 1) / 2) * S); root.add(sc);
      const sl = new THREE.PointLight(0xffe6c7, 0.7, 12, 1.2);
      sl.position.set((st.x + 0.5) * S, F2 + 1.5, (st.z0 + 2) * S); root.add(sl);

      // 바깥 땅(마당+미로) 잔디
      const MX = R.maze.x, MZ = R.maze.z;
      const gx0 = (R.yard.x0 - 1) * S, gz0 = Math.min(MZ, R.yard.z0 - 1) * S;
      const gx1 = (MX + mz.W) * S, gz1 = Math.max(MZ + mz.H, R.yard.z1 + 2) * S;
      const gtex = floorTexture('grass'); gtex.repeat.set((gx1 - gx0) / 2, (gz1 - gz0) / 2);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(gx1 - gx0, gz1 - gz0), new THREE.MeshLambertMaterial({ map: gtex }));
      ground.rotation.x = -Math.PI / 2; ground.position.set((gx0 + gx1) / 2, 0, (gz0 + gz1) / 2); root.add(ground);

      // 문
      this.doors.forEach((dr) => {
        const thinX = dr.axis === 'x';
        const m = new THREE.Mesh(thinX ? new THREE.BoxGeometry(0.3, WH, S) : new THREE.BoxGeometry(S, WH, 0.3),
          new THREE.MeshLambertMaterial({ color: dr.front ? 0x6b3fa0 : dr.key === 'kitchen' ? 0x2f6f4f : 0x8b5a2b }));
        m.position.set((dr.x + 0.5) * S, dr.cell.floorY + WH / 2, (dr.z + 0.5) * S);
        const knob = new THREE.MeshLambertMaterial({ color: 0xffd23f });
        [-0.2, 0.2].forEach((o) => {
          const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), knob);
          if (thinX) k.position.set(o, -0.3, 0.6); else k.position.set(0.6, -0.3, o);
          m.add(k);
        });
        root.add(m);
        dr.mesh = m;
        dr.baseY = m.position.y;
        dr.labels = [-1, 1].map((side) => {
          const l = U.makeLabel(this.doorText(dr), { height: 0.3 });
          const off = side * (S / 2 + 0.06);
          l.position.set(m.position.x + (thinX ? off : 0), dr.cell.floorY + 2.6, m.position.z + (thinX ? 0 : off));
          root.add(l);
          return l;
        });
      });

      // 상자
      this.chests.forEach((ch) => {
        const b = M.chest(ch.kind);
        const y = this.cell(ch.x, ch.z).floorY;
        b.group.position.set((ch.x + 0.5) * S, y, (ch.z + 0.5) * S);
        b.group.rotation.y = this.facing(ch.x, ch.z);
        root.add(b.group);
        ch.lid = b.lid; ch.wx = b.group.position.x; ch.wz = b.group.position.z; ch.wy = y;
      });

      // 미니게임 오락기
      this.stations.forEach((stn) => {
        const def = G.Minigames.defs[stn.game];
        const b = M.station(def.color);
        const y = this.cell(stn.x, stn.z).floorY;
        b.group.position.set((stn.x + 0.5) * S, y, (stn.z + 0.5) * S);
        b.group.rotation.y = this.facing(stn.x, stn.z);
        root.add(b.group);
        stn.screen = b; stn.wx = b.group.position.x; stn.wz = b.group.position.z;
        b.setScreen([def.title, 'E: 플레이'], '#24135a');
        const l = U.makeLabel(def.title, { height: 0.3, bg: 'rgba(90,30,160,0.85)' });
        l.position.set(stn.wx, y + 2.75, stn.wz); root.add(l);
      });

      // 통나무 장애물
      const logMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b }), ringMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
      this.hurdles.forEach((c) => {
        const g = new THREE.Group();
        const r = HURDLE_H / 2;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(r, r, S * 1.45, 14), logMat);
        log.rotation.z = Math.PI / 2; g.add(log);
        [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 14), ringMat); e.position.x = s * S * 0.726; e.rotation.y = s * Math.PI / 2; g.add(e); });
        g.position.set((c.x + 0.5) * S, r, (c.z + 0.5) * S);
        g.rotation.y = c.hurdle.alongX ? Math.PI / 2 : 0; // 길을 가로막는 방향
        root.add(g);
      });

      // 가구
      this.decor.forEach((d) => {
        const g = M.decor(d.type);
        g.position.set((d.x + 0.5) * S, this.cell(d.x, d.z).floorY, (d.z + 0.5) * S);
        g.rotation.y = this.facing(d.x, d.z);
        root.add(g);
      });

      // 노스니 조합대 (미로 맨 끝, 심장 상자 바로 앞)
      const ns = this.nosni;
      const yaw = Math.atan2(-ns.dir.x, -ns.dir.z);
      const al = M.altar(); al.position.set(ns.x, 0, ns.z); al.rotation.y = yaw; root.add(al);
      const nm = M.nosni();
      nm.root.position.set(ns.x, 0, ns.z);
      nm.root.rotation.y = yaw;
      nm.inner.rotation.x = -Math.PI / 2;
      nm.inner.position.set(0, 0.55, 1);
      root.add(nm.root);
      ns.model = nm;
      ns.label = U.makeLabel('🧩 노스니 조합대 (몸 0/5)', { height: 0.32, bg: 'rgba(40,80,160,0.85)' });
      ns.label.position.set(ns.x, 1.6, ns.z); root.add(ns.label);
      const glow = new THREE.PointLight(0xff6699, 1.2, 10, 1.2);
      glow.position.set(ns.x, 2.4, ns.z); root.add(glow);
    },

    doorText(dr) {
      return `${dr.front ? '🚪' : '🔒'} ${G.Rooms.byId[dr.key].name} 열쇠 → ${dr.to}`;
    },

    // 너비우선 탐색 거리장 (-1 = 못 감)
    bfs(sx, sz) {
      const W = this.W, H = this.H, N = W * H, cells = this.cells;
      const dist = new Int32Array(N).fill(-1);
      if (sx < 0 || sz < 0 || sx >= W || sz >= H) return dist;
      const q = new Int32Array(N);
      let h = 0, t = 0;
      const s = sz * W + sx;
      dist[s] = 0; q[t++] = s;
      while (h < t) {
        const i = q[h++], x = i % W, nd = dist[i] + 1;
        if (x > 0 && dist[i - 1] < 0 && !cells[i - 1].solid) { dist[i - 1] = nd; q[t++] = i - 1; }
        if (x < W - 1 && dist[i + 1] < 0 && !cells[i + 1].solid) { dist[i + 1] = nd; q[t++] = i + 1; }
        if (i >= W && dist[i - W] < 0 && !cells[i - W].solid) { dist[i - W] = nd; q[t++] = i - W; }
        if (i < N - W && dist[i + W] < 0 && !cells[i + W].solid) { dist[i + W] = nd; q[t++] = i + W; }
      }
      return dist;
    },

    // 원형 몸체 이동 + 충돌 (칸마다 충돌 상자 크기가 다름)
    //  pos.y(발 높이)가 장애물 꼭대기보다 높으면 통과 → 점프로 가구/통나무 넘기
    moveCircle(pos, dx, dz, r, ignoreHurdles) {
      pos.x += dx; this.resolve(pos, r, ignoreHurdles);
      pos.z += dz; this.resolve(pos, r, ignoreHurdles);
    },
    // 그 칸이 막고 있는 상자(없으면 null)
    blockerBox(c, y, ignoreHurdles) {
      if (c.solid) {
        if (c.h !== undefined && c.h !== Infinity && y >= (c.floorY || 0) + c.h - STEP) return null;
        return c.box || FULL;
      }
      if (c.hurdle && !ignoreHurdles && y < (c.floorY || 0) + c.hurdle.h - STEP) return c.hurdle.box;
      return null;
    },
    // 발 밑 높이 (바닥, 계단, 올라선 가구/통나무 위)
    surfaceAt(px, pz, py, r) {
      const S = C.cellSize;
      let g = this.groundAt(px, pz);
      const cx = Math.floor(px / S), cz = Math.floor(pz / S);
      for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
        const c = this.cell(x, z);
        const h = c.hurdle ? c.hurdle.h : (c.type === 'prop' && c.h !== Infinity ? c.h : 0);
        if (!h) continue;
        const top = (c.floorY || 0) + h;
        if (py < top - STEP) continue;
        const b = c.hurdle ? c.hurdle.box : (c.box || FULL);
        const nx = Math.max((x + b[0]) * S, Math.min(px, (x + b[1]) * S)), nz = Math.max((z + b[2]) * S, Math.min(pz, (z + b[3]) * S));
        if ((px - nx) ** 2 + (pz - nz) ** 2 < r * r) g = Math.max(g, top);
      }
      return g;
    },
    resolve(pos, r, ignoreHurdles) {
      const S = C.cellSize;
      const cx = Math.floor(pos.x / S), cz = Math.floor(pos.z / S);
      for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
        const c = this.cell(x, z);
        const b = this.blockerBox(c, pos.y || 0, ignoreHurdles);
        if (!b) continue;
        const minX = (x + b[0]) * S, maxX = (x + b[1]) * S, minZ = (z + b[2]) * S, maxZ = (z + b[3]) * S;
        const nx = Math.max(minX, Math.min(pos.x, maxX)), nz = Math.max(minZ, Math.min(pos.z, maxZ));
        const ddx = pos.x - nx, ddz = pos.z - nz, d2 = ddx * ddx + ddz * ddz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), push = r - d;
          pos.x += ddx / d * push; pos.z += ddz / d * push;
        } else {
          const l = pos.x - minX, rr = maxX - pos.x, t = pos.z - minZ, bb = maxZ - pos.z, m = Math.min(l, rr, t, bb);
          if (m === l) pos.x = minX - r; else if (m === rr) pos.x = maxX + r; else if (m === t) pos.z = minZ - r; else pos.z = maxZ + r;
        }
      }
    },

    openDoor(dr) {
      dr.locked = false;
      dr.cell.solid = false;
      dr.labels.forEach((l) => { l.visible = false; });
      const m = dr.mesh, WH = C.wallHeight, y0 = dr.baseY;
      G.Fx.add(0.9, (p) => { m.position.y = y0 + U.easeInOut(p) * (WH - 0.05); }, () => { m.visible = false; });
    },

    updateFrontDoor(n) {
      if (this.nosni && !this.nosni.assembled) this.nosni.label.setText(`🧩 노스니 조합대 (몸 ${n}/${Object.keys(C.parts).length})`);
    },

    setStationCleared(st) {
      st.cleared = true;
      st.screen.setScreen(['클리어!', '✔ ' + C.parts[st.part].label], '#1f7a3f');
    },

    // 조합대에서 부위를 하나씩 붙이는 연출
    assembleNosni(onDone) {
      const ns = this.nosni, nm = ns.model;
      ns.assembled = true;
      ns.label.setText('🧩 노스니 조립 중...');
      const order = ['legs', 'body', 'arms', 'hands', 'head'];
      order.forEach((p, i) => {
        setTimeout(() => {
          nm.setPart(p, true);
          G.Audio.play('pickup');
          const s = U.makeLabel(C.parts[p].icon, { bg: null, height: 0.8, font: 'bold 60px sans-serif' });
          s.position.set(ns.x, 1.4, ns.z); this.root.add(s);
          G.Fx.add(0.9, (q) => { s.position.y = 1.4 + q; s.material.opacity = 1 - q; }, () => this.root.remove(s));
          if (i === order.length - 1) {
            ns.label.setText('💤 노스니 (심장이 필요해)');
            if (onDone) onDone();
          }
        }, 350 * (i + 1));
      });
    },

    openChestAnim(ch, emoji) {
      const lid = ch.lid;
      G.Fx.add(0.35, (p) => { lid.rotation.x = -1.9 * U.easeOutCubic(p); });
      const s = U.makeLabel(emoji, { bg: null, height: 0.9, font: 'bold 60px sans-serif' });
      s.position.set(ch.wx, ch.wy + 1.0, ch.wz);
      this.root.add(s);
      G.Fx.add(1.4, (p) => {
        s.position.y = ch.wy + 1.0 + p * 1.2;
        s.material.opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      }, () => { this.root.remove(s); });
    },
  };

  G.World = World;
})();
