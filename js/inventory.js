// 가방 — 죽어도 사라지지 않음
(function () {
  const C = G.CONFIG;

  G.Inventory = {
    reset() {
      this.keys = {};
      this.usedKeys = {};
      this.selfie = 0;
      this.parts = {};
      this.heart = false;
      this.changed = true;
    },
    addKey(room) { this.keys[room] = true; this.changed = true; },
    useKey(room) { this.usedKeys[room] = true; this.changed = true; },
    addSelfie() { this.selfie++; this.changed = true; },
    useSelfie() { this.selfie--; this.changed = true; },
    addPart(p) { this.parts[p] = true; this.changed = true; },
    addHeart() { this.heart = true; this.changed = true; },
    partCount() { return Object.keys(this.parts).length; },

    barHTML() {
      let h = '';
      G.Rooms.list.forEach((r) => {
        if (this.keys[r.id]) h += `<span class="slot ${this.usedKeys[r.id] ? 'used' : ''}">🔑<small>${r.name}</small></span>`;
      });
      h += `<span class="slot ${this.selfie ? '' : 'empty'}">📱<small>×${this.selfie}</small></span>`;
      Object.keys(C.parts).forEach((p) => {
        const has = this.parts[p];
        h += `<span class="slot ${has ? '' : 'empty'}">${has ? C.parts[p].icon : '❔'}<small>${C.parts[p].label}</small></span>`;
      });
      h += `<span class="slot ${this.heart ? '' : 'empty'}">${this.heart ? '❤️' : '❔'}<small>심장</small></span>`;
      return h;
    },

    panelHTML() {
      const keyRooms = G.Rooms.list.filter((r) => C.chests[r.id] && C.chests[r.id].includes('key'));
      const keys = keyRooms.map((r) => {
        const s = this.usedKeys[r.id] ? '✅ 사용함' : this.keys[r.id] ? '🔑 있음' : '⬜ 없음';
        return `<li>${r.name} 열쇠 — ${s}</li>`;
      }).join('');
      const parts = Object.keys(C.parts).map((p) => `<li>${this.parts[p] ? C.parts[p].icon + ' ✅' : '⬜'} 노스니의 ${C.parts[p].label}</li>`).join('');
      return `
        <div class="bag-grid">
          <div><h3>🔑 열쇠</h3><ul>${keys}</ul></div>
          <div><h3>🧩 노스니의 몸 (${this.partCount()}/${Object.keys(C.parts).length})</h3><ul>${parts}<li>${this.heart ? '❤️ ✅' : '⬜'} 노스니의 심장</li></ul></div>
        </div>
        <p class="bag-selfie">📱 셀카폰 <b>${this.selfie}</b>개 — Q키: 납치범 위치를 잠깐 보여줘요</p>`;
    },
  };
})();
