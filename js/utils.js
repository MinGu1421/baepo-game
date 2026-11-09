(function () {
  const U = {
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    canvasTexture(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      return new THREE.CanvasTexture(c);
    },

    // 글자/이모지 스프라이트. sprite.setText()로 내용 변경 가능
    makeLabel(text, o) {
      o = o || {};
      const font = o.font || 'bold 44px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: o.depthTest !== false, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      const worldH = o.height || 0.4;
      sprite.setText = (t) => {
        ctx.font = font;
        const w = Math.ceil(ctx.measureText(t).width) + 36;
        const h = 68;
        canvas.width = w; canvas.height = h;
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (o.bg !== null) {
          ctx.fillStyle = o.bg || 'rgba(20,10,45,0.78)';
          U.roundRect(ctx, 0, 0, w, h, 18); ctx.fill();
        }
        ctx.fillStyle = o.color || '#fff';
        ctx.fillText(t, w / 2, h / 2 + 2);
        tex.needsUpdate = true;
        sprite.scale.set(worldH * w / h, worldH, 1);
      };
      sprite.setText(text);
      if (o.depthTest === false) sprite.renderOrder = 999;
      return sprite;
    },
  };
  G.U = U;

  // 간단한 트윈/타이머
  G.Fx = {
    list: [],
    add(dur, update, done) { this.list.push({ t: 0, dur, update, done }); },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const f = this.list[i];
        f.t += dt;
        const p = Math.min(1, f.t / f.dur);
        if (f.update) f.update(p);
        if (p >= 1) { this.list.splice(i, 1); if (f.done) f.done(); }
      }
    },
    clear() { this.list.length = 0; },
  };
})();
