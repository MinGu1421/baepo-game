// 도망자 쫄라맨 (1인칭) — 이동, 달리기, 점프, 계단
(function () {
  const C = G.CONFIG;

  G.Player = {
    init(camera, scene) {
      this.camera = camera;
      camera.rotation.order = 'YXZ';
      this.pos = new THREE.Vector3();
      this.yaw = 0; this.pitch = 0;
      this.hands = G.Models.hands();
      camera.add(this.hands.group);
      this.shadow = G.Models.blob(0.38);
      scene.add(this.shadow);
      this.reset();
    },

    reset() {
      this.stamina = C.player.staminaMax;
      this.exhausted = false;
      this.bob = 0; this.moving = false; this.running = false; this.shake = 0;
      this.vy = 0; this.onGround = true;
      this.hands.group.visible = true;
      this.shadow.visible = true;
    },

    place(cx, cz, yaw) {
      const c = G.World.center(cx, cz);
      this.pos.set(c.x, G.World.groundAt(c.x, c.z), c.z);
      this.vy = 0; this.onGround = true;
      this.yaw = yaw; this.pitch = 0;
      this.sync(0);
    },

    look(mx, my) {
      const s = C.player.mouseSensitivity;
      this.yaw -= mx * s;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - my * s));
    },

    jump() {
      if (!this.onGround) return;
      this.vy = C.player.jumpSpeed;
      this.onGround = false;
      G.Audio.play('jump');
    },

    forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; },

    update(dt, keys, speedMul) {
      const P = C.player;
      let fx = 0, fz = 0;
      if (keys.KeyW || keys.ArrowUp) fz += 1;
      if (keys.KeyS || keys.ArrowDown) fz -= 1;
      if (keys.KeyA || keys.ArrowLeft) fx -= 1;
      if (keys.KeyD || keys.ArrowRight) fx += 1;
      const len = Math.hypot(fx, fz);
      this.moving = len > 0;

      const wantRun = keys.ShiftLeft || keys.ShiftRight;
      this.running = false;
      if (this.moving && wantRun && !this.exhausted && this.stamina > 0) {
        this.running = true;
        this.stamina -= P.staminaDrain * dt;
        if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; }
      } else {
        this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * dt);
        if (this.exhausted && this.stamina >= P.staminaMax * 0.3) this.exhausted = false;
      }

      if (this.moving) {
        fx /= len; fz /= len;
        const sp = (this.running ? P.runSpeed : P.walkSpeed) * speedMul;
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        G.World.moveCircle(this.pos, (-sin * fz + cos * fx) * sp * dt, (-cos * fz - sin * fx) * sp * dt, P.radius);
        if (this.onGround) this.bob += dt * (this.running ? 14 : 9);
      }

      // 높이: 점프/중력, 계단은 바닥에 붙어서 내려감
      const ground = G.World.surfaceAt(this.pos.x, this.pos.z, this.pos.y, P.radius);
      if (this.onGround) {
        if (this.pos.y - ground > 0.35) { this.onGround = false; this.vy = 0; }
        else this.pos.y = ground;
      }
      if (!this.onGround) {
        this.vy -= P.gravity * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.onGround = true; }
      }
      this.sync(dt);
    },

    sync(dt) {
      this.shake = Math.max(0, this.shake - (dt || 0));
      const sh = this.shake * 0.5;
      const bobY = this.moving && this.onGround ? Math.sin(this.bob) * (this.running ? 0.07 : 0.045) : 0;
      this.camera.position.set(
        this.pos.x + (Math.random() - 0.5) * sh,
        this.pos.y + C.eyeHeight + bobY + (Math.random() - 0.5) * sh,
        this.pos.z + (Math.random() - 0.5) * sh
      );
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.hands.update(this.bob, this.moving);
      this.shadow.position.set(this.pos.x, G.World.groundAt(this.pos.x, this.pos.z) + 0.03, this.pos.z);
    },
  };
})();
