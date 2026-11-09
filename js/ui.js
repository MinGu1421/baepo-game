// 화면 UI (HUD, 오버레이 화면, 알림)
(function () {
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['start-screen', 'consent-screen', 'profile-screen', 'difficulty-screen', 'skip-layer', 'resume-screen', 'pause-screen',
    'caught-screen', 'gameover-screen', 'win-screen', 'minigame', 'load-error'];

  G.UI = {
    init() {
      this.e = {};
      ['hud', 'hearts', 'room-name', 'objective', 'timer', 'bag-bar', 'prompt', 'radar', 'radar-arrow', 'radar-text',
        'status-icons', 'stamina-fill', 'toast-area', 'room-banner', 'vignette', 'blind-overlay', 'flash', 'subtitle',
        'bag-panel', 'bag-content', 'caught-sub', 'gameover-why', 'gameover-stats', 'win-stats', 'win-board',
        'parts-strip', 'btn-sound'].forEach((id) => { this.e[id] = $(id); });
      this.cache = {};
    },

    esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },

    screen(id) { SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id)); },
    hud(on) { this.e.hud.classList.toggle('hidden', !on); },

    set(key, html) {
      if (this.cache[key] === html) return;
      this.cache[key] = html;
      this.e[key].innerHTML = html;
    },

    hearts(n, max) {
      let s = '';
      for (let i = 0; i < max; i++) s += i < n ? '❤️' : '🖤';
      this.set('hearts', s);
    },

    prompt(t) {
      const el = this.e.prompt;
      if (!t) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      this.set('prompt', t);
    },

    toast(msg, type) {
      const area = this.e['toast-area'];
      const d = document.createElement('div');
      d.className = 'toast ' + (type || '');
      d.innerHTML = msg;
      area.appendChild(d);
      while (area.children.length > 3) area.firstChild.remove();
      setTimeout(() => d.classList.add('out'), 2800);
      setTimeout(() => d.remove(), 3400);
    },

    banner(text) {
      const el = this.e['room-banner'];
      el.textContent = text;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    },

    stamina(p, exhausted) {
      const f = this.e['stamina-fill'];
      f.style.width = p.toFixed(1) + '%';
      f.classList.toggle('ex', exhausted);
    },

    danger(v) { this.e.vignette.style.opacity = v.toFixed(2); },
    blind(v) { this.e['blind-overlay'].style.opacity = v.toFixed(2); },

    radar(show, angle, dist) {
      this.e.radar.classList.toggle('hidden', !show);
      if (!show) return;
      this.e['radar-arrow'].style.transform = `rotate(${angle}rad)`;
      this.set('radar-text', `📸 납치범 ${Math.round(dist)}m`);
    },

    flash(color, dur) {
      const el = this.e.flash;
      el.style.transition = 'none';
      el.style.background = color;
      el.style.opacity = 1;
      void el.offsetWidth;
      el.style.transition = `opacity ${dur || 0.6}s`;
      el.style.opacity = 0;
    },

    fadeIn(color, dur) {
      const el = this.e.flash;
      el.style.transition = 'none';
      el.style.background = color;
      el.style.opacity = 0;
      void el.offsetWidth;
      el.style.transition = `opacity ${dur}s`;
      el.style.opacity = 1;
    },

    clearFlash() { const el = this.e.flash; el.style.transition = 'none'; el.style.opacity = 0; },

    // 화면 아래 자막 (secs를 주면 그 시간 뒤 자동으로 사라짐)
    subtitle(t, secs) {
      const el = this.e.subtitle;
      clearTimeout(this.subTimer);
      if (!t) { el.classList.add('hidden'); return; }
      el.textContent = t;
      el.classList.remove('hidden');
      if (secs) this.subTimer = setTimeout(() => el.classList.add('hidden'), secs * 1000);
    },

    // 남은 시간 (1분 이하면 빨갛게)
    timer(sec) {
      const c = Math.ceil(sec), m = Math.floor(c / 60), s = c % 60;
      this.set('timer', `⏰ 남은 시간 ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      this.e.timer.classList.toggle('urgent', sec <= 60);
    },

    bag(force) {
      const el = this.e['bag-panel'];
      const show = force === undefined ? el.classList.contains('hidden') : force;
      el.classList.toggle('hidden', !show);
    },

    sound(on) { this.e['btn-sound'].textContent = on ? '🔊 소리 켜짐 (M)' : '🔇 소리 꺼짐 (M)'; },
  };
})();
