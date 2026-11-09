// 오른쪽 아래 미니맵 — 내 주변 지도 + 내 위치(화살표). 납치범은 표시하지 않음.
(function () {
  const C = G.CONFIG;
  const RADIUS = 9; // 보여줄 칸 수 (반경)

  G.Minimap = {
    init() {
      this.canvas = document.getElementById('minimap');
      this.ctx = this.canvas.getContext('2d');
      this.label = document.getElementById('minimap-label');
    },

    // 새 맵이 만들어질 때 상자/오락기 위치 표를 다시 만듦
    reset() {
      const W = G.World;
      this.marks = {};
      W.chests.forEach((ch) => { this.marks[W.idx(ch.x, ch.z)] = { kind: 'chest', ref: ch }; });
      W.stations.forEach((st) => { this.marks[W.idx(st.x, st.z)] = { kind: 'station', ref: st }; });
      const nc = W.cellOf({ x: W.nosni.x, z: W.nosni.z });
      this.marks[W.idx(nc.x, nc.z)] = { kind: 'altar' };
    },

    color(c) {
      switch (c.type) {
        case 'wall': return '#4b4366';
        case 'mwall': return '#1d5c2f';
        case 'door': return c.solid ? '#d97706' : '#c9b79a';
        case 'prop': return '#8b7d6b';
        case 'floor':
          if (c.ramp) return '#a0784f';
          if (c.zone === 'maze') return c.hurdle ? '#6b4423' : '#5d8f45';
          return c.floorY > 0 ? '#e2d3b5' : '#cdbb9c';
        default: return null;
      }
    },

    draw(roomName) {
      const W = G.World, P = G.Player, ctx = this.ctx;
      const size = this.canvas.width, cs = size / (RADIUS * 2 + 1);
      const S = C.cellSize;
      const px = P.pos.x / S, pz = P.pos.z / S;
      const bx = Math.floor(px), bz = Math.floor(pz);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(15,8,40,0.85)'; ctx.fillRect(0, 0, size, size);
      for (let dz = -RADIUS - 1; dz <= RADIUS + 1; dz++) for (let dx = -RADIUS - 1; dx <= RADIUS + 1; dx++) {
        const x = bx + dx, z = bz + dz;
        const c = W.cell(x, z);
        const col = this.color(c);
        if (!col) continue;
        const sx = size / 2 + (x - px) * cs, sz = size / 2 + (z - pz) * cs;
        ctx.fillStyle = col;
        ctx.fillRect(sx, sz, cs + 0.6, cs + 0.6);
        const m = this.marks[W.idx(x, z)];
        if (m) {
          if (m.kind === 'chest' && !m.ref.opened) { ctx.fillStyle = '#facc15'; ctx.fillRect(sx + cs * 0.25, sz + cs * 0.25, cs * 0.5, cs * 0.5); }
          if (m.kind === 'station') { ctx.fillStyle = m.ref.cleared ? '#22c55e' : '#c084fc'; ctx.fillRect(sx + cs * 0.15, sz + cs * 0.15, cs * 0.7, cs * 0.7); }
          if (m.kind === 'altar') { ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(sx + cs / 2, sz + cs / 2, cs * 0.45, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.restore();
      // 내 위치 = 화살표 (바라보는 방향)
      const f = P.forward();
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(Math.atan2(f.x, -f.z));
      ctx.fillStyle = '#ff3b6b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('N', size / 2, 16);
      if (this.label.textContent !== roomName) this.label.textContent = roomName;
    },
  };
})();
