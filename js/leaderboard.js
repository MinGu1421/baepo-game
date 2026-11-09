// 리더보드 — 난이도별(쉬움/보통/어려움) 클리어 시간 순위.
// 여러 컴퓨터가 Supabase(서버)에 함께 기록하고, leaderboard.html 에서 실시간으로 볼 수 있어요.
// 인터넷이 안 되면 이 컴퓨터에 임시 저장했다가, 다시 연결되면 자동으로 올려요.
(function () {
  const PENDING_KEY = 'wroom-pending-v1';
  const DIFFS = ['easy', 'normal', 'hard'];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  G.Leaderboard = {
    cache: { easy: [], normal: [], hard: [] },
    online: null, // null = 아직 모름, true/false = 마지막 연결 상태

    headers() {
      const k = G.CONFIG.supabase.key;
      return { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' };
    },
    endpoint(query) {
      const S = G.CONFIG.supabase;
      return `${S.url}/rest/v1/${S.table}${query || ''}`;
    },

    // 서버에서 순위 불러오기 (실패하면 마지막으로 불러온 내용 유지)
    async fetchTop(diff, n) {
      try {
        const q = `?select=id,grade,class_no,nick,time_sec&difficulty=eq.${diff}&order=time_sec.asc,id.asc&limit=${n || 100}`;
        const r = await fetch(this.endpoint(q), { headers: this.headers() });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        this.cache[diff] = await r.json();
        this.online = true;
        this.flushPending();
      } catch (e) { this.online = false; }
      return this.cache[diff];
    },

    // 기록 추가 → 몇 등인지 돌려줌 (0 = 서버 저장 실패, 이 컴퓨터에 임시 저장됨)
    async add(diff, p, time) {
      const row = { difficulty: diff, grade: p.grade, class_no: p.cls, nick: p.nick, time_sec: Math.round(time * 10) / 10 };
      try {
        const r = await fetch(this.endpoint(), {
          method: 'POST',
          headers: Object.assign({ Prefer: 'return=representation' }, this.headers()),
          body: JSON.stringify(row),
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const saved = (await r.json())[0];
        this.online = true;
        const list = await this.fetchTop(diff, 500);
        const i = list.findIndex((e) => e.id === saved.id);
        return i >= 0 ? i + 1 : list.length + 1;
      } catch (e) {
        this.online = false;
        this.queue(row);
        return 0;
      }
    },

    // 인터넷이 안 될 때 임시 저장 / 나중에 다시 올리기
    queue(row) {
      try {
        const q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        q.push(row);
        localStorage.setItem(PENDING_KEY, JSON.stringify(q.slice(-50)));
      } catch (e) { /* 저장소를 못 쓰면 포기 */ }
    },
    async flushPending() {
      if (this.flushing) return;
      let q;
      try { q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return; }
      if (!q.length) return;
      this.flushing = true;
      const rest = [];
      for (const row of q) {
        try {
          const r = await fetch(this.endpoint(), { method: 'POST', headers: this.headers(), body: JSON.stringify(row) });
          if (!r.ok && r.status >= 500) rest.push(row); // 서버 문제만 재시도, 형식 오류는 버림
        } catch (e) { rest.push(row); }
      }
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(rest)); } catch (e) { /* 무시 */ }
      this.flushing = false;
    },

    fmt(sec) {
      const m = Math.floor(sec / 60), s = sec - m * 60;
      return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
    },

    // 1~n등 HTML (마지막으로 불러온 순위 기준)
    topHTML(diff, n) {
      const list = this.cache[diff].slice(0, n || 3);
      const medals = ['🥇', '🥈', '🥉'];
      const note = this.online === false ? '<li class="lb-empty">⚠️ 서버에 연결할 수 없어요<br>(기록은 나중에 자동으로 올라가요)</li>' : '';
      if (!list.length) return note || '<li class="lb-empty">아직 기록이 없어요<br>첫 번째 탈출자가 되어보세요!</li>';
      return note + list.map((e, i) => `<li><span class="lb-medal">${medals[i] || (i + 1) + '등'}</span>
        <span class="lb-who">${esc(e.grade)}학년 ${esc(e.class_no)}반 <b>${esc(e.nick)}</b></span>
        <span class="lb-time">${this.fmt(Number(e.time_sec))}</span></li>`).join('');
    },
  };
})();
