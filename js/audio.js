// 소리: 기본 노래("W를 가져가") ↔ 납치범이 가까우면 추격 노래로 전환.
// config.js의 assets.sounds 경로에 파일이 있으면 그 파일을, 없으면 내장 합성음을 재생.
(function () {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // 내장 합성 곡 패턴 (16분음표 64스텝)
  const SONGS = {
    // 기본 곡: 밝고 통통 튀는 "W 테마"
    base: {
      bpm: 128,
      step(A, s, t, out) {
        if (s % 4 === 0) A.tone(140, 0.15, 'sine', 0.55, t, out, 45);
        if (s % 4 === 2) A.noise(0.04, 0.08, t, out, 7000, 'highpass');
        if (s % 8 === 4) A.noise(0.1, 0.18, t, out, 1800, 'highpass');
        const bass = [48, 48, 53, 53, 55, 55, 48, 52];
        if (s % 2 === 0) A.tone(midi(bass[(s >> 3) % 8]), 0.12, 'square', 0.09, t, out);
        const lead = [72, 0, 76, 79, 0, 76, 72, 0, 74, 0, 77, 81, 0, 79, 76, 0,
          72, 0, 76, 79, 0, 84, 83, 0, 81, 79, 77, 76, 74, 0, 72, 0];
        const n = lead[s % 32];
        if (n) A.tone(midi(n), 0.14, 'triangle', 0.15, t, out);
        if (s % 16 === 0) A.tone(midi(84), 0.08, 'square', 0.05, t, out); // "W!"
      },
    },
    // 추격 곡: 빠르고 긴장감 있는 단조
    chase: {
      bpm: 160,
      step(A, s, t, out) {
        if (s % 4 === 0 || s % 16 === 10) A.tone(160, 0.14, 'sine', 0.7, t, out, 40);
        if (s % 2 === 1) A.noise(0.03, 0.09, t, out, 8000, 'highpass');
        if (s % 8 === 4) A.noise(0.12, 0.28, t, out, 1200, 'highpass');
        const bass = [45, 45, 45, 48, 46, 46, 44, 44];
        A.tone(midi(bass[(s >> 3) % 8]), 0.09, 'sawtooth', 0.08, t, out);
        if (s % 8 === 0) A.tone(midi(81), 0.25, 'square', 0.07, t, out, midi(76)); // 사이렌
        const lead = [69, 72, 69, 75, 69, 72, 74, 72];
        if (s % 2 === 0 && (s >> 4) % 2 === 1) A.tone(midi(lead[(s >> 1) % 8]), 0.1, 'square', 0.08, t, out);
      },
    },
  };

  G.Audio = {
    ctx: null, enabled: true, danger: 0, musicOn: false, mode: 'base', files: {},

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = this.enabled ? 0.8 : 0; this.master.connect(ctx.destination);
      this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = 0.7; this.sfxGain.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      // 효과음 파일
      const snd = G.CONFIG.assets.sounds;
      for (const k in snd) {
        if (!snd[k] || k === 'music' || k === 'chase') continue;
        const a = new Audio(snd[k]); a.preload = 'auto';
        this.files[k] = a;
        a.addEventListener('error', () => { delete this.files[k]; });
      }

      // 두 곡 (파일이 있으면 파일, 실패하면 합성)
      this.tracks = {};
      [['base', snd.music], ['chase', snd.chase]].forEach(([name, path]) => {
        const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master);
        const tr = { name, gain: g, vol: 0, step: 0, next: 0, file: null };
        if (path) {
          const a = new Audio(path); a.loop = true; a.preload = 'auto'; a.volume = 0;
          a.addEventListener('error', () => { tr.file = null; });
          tr.file = a;
        }
        this.tracks[name] = tr;
      });
      setInterval(() => this.schedule(), 25);
    },

    setEnabled(on) {
      this.enabled = on;
      if (this.master) this.master.gain.value = on ? 0.8 : 0;
      if (this.tracks) for (const k in this.tracks) { const f = this.tracks[k].file; if (f) f.muted = !on; }
    },
    toggle() { this.setEnabled(!this.enabled); return this.enabled; },

    setMusic(on) { this.musicOn = on; if (!on) this.mode = 'base'; },
    setChase(on) { this.mode = on ? 'chase' : 'base'; },

    // 위험도(0~1)에 따라 곡 전환 (깜빡거리지 않게 켜짐/꺼짐 기준을 다르게)
    setDanger(v) {
      this.danger = v;
      const M = G.CONFIG.music;
      if (this.mode === 'base' && v >= M.chaseOn) this.mode = 'chase';
      else if (this.mode === 'chase' && v <= M.chaseOff) this.mode = 'base';
    },

    update(dt) {
      if (!this.ctx) return;
      const vol = G.CONFIG.music.volume;
      for (const k in this.tracks) {
        const tr = this.tracks[k];
        const target = this.musicOn && this.mode === k ? vol : 0;
        tr.vol += (target - tr.vol) * Math.min(1, dt * 4);
        if (tr.vol < 0.002 && target === 0) tr.vol = 0;
        if (tr.file) {
          tr.gain.gain.value = 0;
          tr.file.volume = Math.min(1, tr.vol * 1.6);
          if (tr.vol > 0 && tr.file.paused) tr.file.play().catch(() => {});
          if (tr.vol === 0 && !tr.file.paused) tr.file.pause();
        } else {
          tr.gain.gain.value = tr.vol;
        }
      }
    },

    schedule() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      for (const k in this.tracks) {
        const tr = this.tracks[k];
        if (tr.file || tr.vol <= 0) { tr.next = 0; continue; }
        const song = SONGS[k], spb = 60 / song.bpm / 4;
        if (tr.next < now) tr.next = now + 0.05;
        while (tr.next < now + 0.12) {
          song.step(this, tr.step, tr.next, tr.gain);
          tr.next += spb;
          tr.step = (tr.step + 1) % 64;
        }
      }
    },

    tone(f, dur, type, vol, when, dest, slideTo) {
      const ctx = this.ctx; when = when || ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, when);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(dest || this.sfxGain);
      o.start(when); o.stop(when + dur + 0.02);
    },
    noise(dur, vol, when, dest, freq, type) {
      const ctx = this.ctx; when = when || ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq || 1000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
      src.start(when); src.stop(when + dur + 0.02);
    },

    play(name) {
      if (!this.ctx || !this.enabled) return;
      if (this.files[name]) { const a = this.files[name].cloneNode(); a.play().catch(() => {}); return; }
      const t = this.ctx.currentTime;
      switch (name) {
        case 'chestOpen': this.tone(300, 0.15, 'square', 0.15, t, null, 600); this.tone(600, 0.2, 'triangle', 0.15, t + 0.12, null, 900); break;
        case 'pickup': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, t + i * 0.07)); break;
        case 'trap': this.tone(400, 0.5, 'sawtooth', 0.2, t, null, 60); this.noise(0.4, 0.2, t, null, 400, 'lowpass'); break;
        case 'caught': this.tone(220, 0.7, 'sawtooth', 0.25, t, null, 55); this.noise(0.4, 0.3, t, null, 800, 'lowpass'); break;
        case 'door': this.noise(0.5, 0.15, t, null, 600, 'lowpass'); this.tone(120, 0.4, 'square', 0.1, t, null, 180); break;
        case 'locked': this.tone(200, 0.1, 'square', 0.12, t); this.tone(160, 0.15, 'square', 0.12, t + 0.1); break;
        case 'hit': this.tone(900, 0.08, 'square', 0.2, t, null, 300); this.noise(0.08, 0.2, t, null, 2000); break;
        case 'shoot': this.noise(0.1, 0.25, t, null, 1200); this.tone(500, 0.1, 'square', 0.1, t, null, 150); break;
        case 'success': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, t + i * 0.12)); break;
        case 'fail': [400, 300, 200].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.12, t + i * 0.18)); break;
        case 'boom': this.noise(1.2, 0.5, t, null, 300, 'lowpass'); this.tone(80, 1, 'sine', 0.5, t, null, 30); break;
        case 'click': this.tone(1200, 0.05, 'square', 0.08, t); break;
        case 'camera': this.noise(0.08, 0.2, t, null, 3000); this.tone(1500, 0.05, 'square', 0.08, t + 0.05); break;
        case 'jump': this.tone(300, 0.15, 'square', 0.08, t, null, 700); break;
        case 'grab': this.tone(700, 0.3, 'sawtooth', 0.2, t, null, 120); this.noise(0.25, 0.25, t, null, 900, 'lowpass'); break;
      }
    },
    beep(freq, dur) { if (this.ctx && this.enabled) this.tone(freq, dur || 0.25, 'triangle', 0.22); },
  };
})();
