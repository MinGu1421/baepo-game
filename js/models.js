// 캐릭터·소품 3D 모델 (기본 도형으로 제작 — 나중에 GLB 모델로 교체 가능)
(function () {
  const U = G.U;
  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m);
  const sph = (r, m, seg) => new THREE.Mesh(new THREE.SphereGeometry(r, seg || 16, Math.max(8, Math.floor((seg || 16) * 0.75))), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

  // 위쪽이 관절(피벗)이고 아래로 뻗는 팔/다리. pivot.userData.seg / end 로 부위 접근
  function limb(w, len, mat, endMat, endR) {
    const pivot = new THREE.Group();
    const seg = at(box(w, len, w, mat), 0, -len / 2, 0);
    pivot.add(seg);
    pivot.userData.seg = seg;
    if (endMat) { const end = at(sph(endR || w * 0.7, endMat, 10), 0, -len, 0); pivot.add(end); pivot.userData.end = end; }
    return pivot;
  }

  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

  // 납치범 얼굴: 하얀 가면 (mood: 'grin' 웃는 가면 / 'sad' 아쉬운 가면)
  function drawKidnapperFace(mood) {
    return (ctx) => {
      ctx.fillStyle = '#ffd2a6'; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#2b1a10';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.lineTo(256, 64);
      for (let x = 224; x >= 0; x -= 32) ctx.lineTo(x, x % 64 === 0 ? 64 : 86);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(0, 0, 22, 200); ctx.fillRect(234, 0, 22, 200); // 옆머리
      // 가면
      ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(128, 150, 98, 104, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7b3fe4'; ctx.fillRect(70, 96, 116, 10);               // 이마 줄무늬
      ctx.fillStyle = '#111';
      if (mood === 'sad') {
        ctx.beginPath(); ctx.ellipse(84, 140, 24, 13, 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(172, 140, 24, 13, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#60a5fa'; ellipse(ctx, 80, 172, 7, 13);              // 눈물
        ctx.strokeStyle = '#111'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(128, 232, 40, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke(); // ㅠ 입
      } else {
        ctx.beginPath(); ctx.ellipse(84, 138, 26, 16, -0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(172, 138, 26, 16, 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ellipse(ctx, 86, 140, 6, 6); ellipse(ctx, 170, 140, 6, 6);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(128, 168, 46, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); // 씨익
      }
    };
  }
  function drawSideHair(ctx) {
    ctx.fillStyle = '#ffd2a6'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#2b1a10'; ctx.fillRect(0, 0, 128, 84);
    ctx.fillStyle = '#ffb08a'; ellipse(ctx, 64, 100, 14, 18); // 귀
  }

  function drawNosniFace(open) {
    return (ctx) => {
      ctx.fillStyle = open ? '#bff0ff' : '#8a8a96'; ctx.fillRect(0, 0, 256, 256);
      if (open) {
        ctx.fillStyle = '#fff'; ellipse(ctx, 84, 120, 32, 38); ellipse(ctx, 172, 120, 32, 38);
        ctx.fillStyle = '#1b2440'; ellipse(ctx, 88, 128, 19, 22); ellipse(ctx, 168, 128, 19, 22);
        ctx.fillStyle = '#fff'; ellipse(ctx, 94, 118, 6, 6); ellipse(ctx, 174, 118, 6, 6);
        ctx.fillStyle = 'rgba(255,120,160,0.5)'; ellipse(ctx, 50, 178, 18, 11); ellipse(ctx, 206, 178, 18, 11);
        ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(128, 175, 28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else {
        ctx.strokeStyle = '#3a3a48'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(56, 128); ctx.lineTo(112, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(144, 128); ctx.lineTo(200, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(108, 190); ctx.lineTo(148, 190); ctx.stroke();
      }
    };
  }

  // ---------------- "W를 가져가" 춤 (크게!) ----------------
  // rig: { t, hips, baseY, headG, armL, armR, legL, legR }
  function dance(rig, dt, moving) {
    rig.t += dt;
    const bps = 128 / 60;
    const beatN = rig.t * bps;
    const beat = beatN * Math.PI;
    const bar = Math.floor(beatN / 2);
    const phase = bar % 2;
    const up = Math.PI, side = Math.PI / 2;
    const pump = Math.sin(beat * 2) * 0.4;
    // 한 팔은 위로 쭉, 한 팔은 옆으로 쭉 → 춤 포즈! 2박마다 좌우 바꾸고 팔을 펌핑
    const tR = phase ? side + pump : up - Math.abs(pump) * 0.6;
    const tL = phase ? -up + Math.abs(pump) * 0.6 : -side - pump;
    const k = Math.min(1, dt * 14);
    rig.armR.rotation.z += (tR - rig.armR.rotation.z) * k;
    rig.armL.rotation.z += (tL - rig.armL.rotation.z) * k;
    rig.armR.rotation.x = Math.sin(beat) * 0.45;
    rig.armL.rotation.x = -Math.sin(beat) * 0.45;
    rig.hips.position.y = rig.baseY + Math.abs(Math.sin(beat)) * 0.3;
    rig.hips.position.x = Math.sin(beat * 0.5) * 0.25;
    rig.hips.rotation.z = Math.sin(beat * 0.5) * 0.25;
    // 4마디마다 한 바퀴 빙글
    const spinP = (beatN % 8) / 2;
    rig.hips.rotation.y = bar % 4 === 3 ? Math.min(1, spinP - 3) * Math.PI * 2 : Math.sin(beat * 0.5) * 0.5;
    rig.headG.rotation.z = Math.sin(beat) * 0.3;
    rig.headG.rotation.x = Math.abs(Math.sin(beat)) * 0.25;
    if (moving) {
      const sw = Math.sin(rig.t * 11) * 0.7;
      rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
      rig.legL.rotation.z = 0; rig.legR.rotation.z = 0;
    } else {
      rig.legL.rotation.x = Math.max(0, Math.sin(beat)) * -0.9;
      rig.legR.rotation.x = Math.max(0, -Math.sin(beat)) * -0.9;
      rig.legL.rotation.z = -0.3 * Math.abs(Math.sin(beat * 0.5));
      rig.legR.rotation.z = 0.3 * Math.abs(Math.sin(beat * 0.5));
    }
  }

  function resetPose(rig) {
    [rig.armL, rig.armR, rig.legL, rig.legR, rig.headG].forEach((p) => p.rotation.set(0, 0, 0));
    rig.hips.rotation.set(0, 0, 0);
    rig.hips.position.set(0, rig.baseY, 0);
    if (rig.setMood) rig.setMood('grin');
  }

  // ---------------- 술래: 납치범 ----------------
  function kidnapper() {
    const root = new THREE.Group();
    const skin = lam(0xffd2a6), pants = lam(0x1d1d3a), shoe = lam(0xf5f5f5), hair = lam(0x2b1a10);
    const jacket = lam(0x7b3fe4);
    const chestTex = U.canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#7b3fe4'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 96px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('W', 64, 70);
    });
    const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.36), [jacket, jacket, jacket, jacket, lam(0xffffff, { map: chestTex }), jacket]);
    torso.position.y = 0.4; hips.add(torso);
    const headG = new THREE.Group(); headG.position.y = 0.82; hips.add(headG);
    const faceGrin = U.canvasTexture(256, 256, drawKidnapperFace('grin'));
    const faceSad = U.canvasTexture(256, 256, drawKidnapperFace('sad'));
    const faceMat = lam(0xffffff, { map: faceGrin });
    const sideMat = lam(0xffffff, { map: U.canvasTexture(128, 128, drawSideHair) });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.5), [sideMat, sideMat, hair, skin, faceMat, hair]);
    head.position.y = 0.3; headG.add(head);
    // 옆머리 (삐죽 튀어나온 머리카락)
    [-1, 1].forEach((s) => {
      headG.add(at(box(0.08, 0.3, 0.42, hair), s * 0.31, 0.42, -0.02));
      headG.add(at(box(0.06, 0.16, 0.3, hair), s * 0.34, 0.26, -0.06));
    });
    headG.add(at(box(0.6, 0.1, 0.54, hair), 0, 0.6, -0.01)); // 정수리
    const armL = limb(0.17, 0.72, jacket, skin); armL.position.set(-0.41, 0.75, 0); hips.add(armL);
    const armR = limb(0.17, 0.72, jacket, skin); armR.position.set(0.41, 0.75, 0); hips.add(armR);
    const legL = limb(0.22, 0.9, pants); legL.position.set(-0.16, 0.02, 0); hips.add(legL);
    const legR = limb(0.22, 0.9, pants); legR.position.set(0.16, 0.02, 0); hips.add(legR);
    legL.add(at(box(0.26, 0.12, 0.38, shoe), 0, -0.86, 0.06));
    legR.add(at(box(0.26, 0.12, 0.38, shoe), 0, -0.86, 0.06));
    root.add(blob(0.5));

    const label = U.makeLabel('납치범 ♪W를 가져가♪', { height: 0.34, bg: 'rgba(110,30,200,0.85)' });
    label.position.y = 2.75; root.add(label);
    const marker = U.makeLabel('📸 납치범 여기!', { height: 0.6, depthTest: false, bg: 'rgba(255,40,80,0.9)' });
    marker.position.y = 3.3; marker.visible = false; root.add(marker);

    const rig = { root, hips, baseY: 0.95, headG, armL, armR, legL, legR, label, marker, t: 0 };
    rig.animate = (dt, moving) => dance(rig, dt, moving);
    rig.setMood = (m) => { faceMat.map = m === 'sad' ? faceSad : faceGrin; faceMat.needsUpdate = true; };
    // 아쉬운 포즈: 무릎 꿇고 한 손은 머리, 한 손은 바닥
    rig.sadPose = (t) => {
      hips.position.set(0, 0.5, 0); hips.rotation.set(0.45, 0, 0);
      legL.rotation.set(-1.35, 0, -0.15); legR.rotation.set(-1.35, 0, 0.15);
      armR.rotation.set(-0.9, 0, 2.5);                     // 오른손: 머리 감싸기
      armL.rotation.set(-0.55, 0, -0.25);                  // 왼손: 바닥 짚기
      headG.rotation.set(0.35, 0, Math.sin(t * 2) * 0.15); // 고개 푹 + 절레절레
    };
    return rig;
  }

  // ---------------- 주인공: 쫄라맨 (컷신용) ----------------
  function zola() {
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const black = lam(0x111111), white = lam(0xffffff);
    const hips = new THREE.Group(); hips.position.y = 0.8; inner.add(hips);
    hips.add(at(cyl(0.05, 0.05, 0.62, black, 8), 0, 0.31, 0));
    const headG = new THREE.Group(); headG.position.y = 0.62; hips.add(headG);
    headG.add(at(sph(0.3, white, 20), 0, 0.3, 0));
    const outline = at(sph(0.32, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }), 20), 0, 0.3, 0);
    headG.add(outline);
    headG.add(at(sph(0.04, black, 8), -0.1, 0.35, 0.27));
    headG.add(at(sph(0.04, black, 8), 0.1, 0.35, 0.27));
    headG.add(at(box(0.12, 0.025, 0.02, black), 0, 0.2, 0.29));
    const armL = limb(0.05, 0.55, black, black, 0.06); armL.position.set(-0.05, 0.55, 0); hips.add(armL);
    const armR = limb(0.05, 0.55, black, black, 0.06); armR.position.set(0.05, 0.55, 0); hips.add(armR);
    const legL = limb(0.05, 0.78, black, black, 0.06); legL.position.set(-0.03, 0.02, 0); hips.add(legL);
    const legR = limb(0.05, 0.78, black, black, 0.06); legR.position.set(0.03, 0.02, 0); hips.add(legR);
    root.add(blob(0.35));
    const rig = { root, inner, hips, baseY: 0.8, headG, armL, armR, legL, legR, t: 0 };
    rig.animate = (dt, moving) => dance(rig, dt, moving);
    return rig;
  }

  // ---------------- 노스니 (부위별로 조립) ----------------
  function nosni() {
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const colors = { head: 0xbff0ff, torso: 0x4fa3ff, arm: 0x4fa3ff, hand: 0xbff0ff, leg: 0x2a4a8a };
    const grey = 0x6d6d78;
    const mats = {};
    for (const k in colors) mats[k] = lam(colors[k]);
    const faceOpen = U.canvasTexture(256, 256, drawNosniFace(true));
    const faceClosed = U.canvasTexture(256, 256, drawNosniFace(false));
    const faceMat = lam(0xffffff, { map: faceClosed });

    const hips = new THREE.Group(); hips.position.y = 0.85; inner.add(hips);
    const torso = at(box(0.6, 0.75, 0.38, mats.torso), 0, 0.37, 0); hips.add(torso);
    const headG = new THREE.Group(); headG.position.y = 0.78; hips.add(headG);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.6, 0.56), [mats.head, mats.head, mats.head, mats.head, faceMat, mats.head]);
    head.position.y = 0.32; headG.add(head);
    const armL = limb(0.17, 0.7, mats.arm, mats.hand, 0.13); armL.position.set(-0.4, 0.7, 0); hips.add(armL);
    const armR = limb(0.17, 0.7, mats.arm, mats.hand, 0.13); armR.position.set(0.4, 0.7, 0); hips.add(armR);
    const legL = limb(0.22, 0.85, mats.leg); legL.position.set(-0.15, 0, 0); hips.add(legL);
    const legR = limb(0.22, 0.85, mats.leg); legR.position.set(0.15, 0, 0); hips.add(legR);
    const heart = at(sph(0.13, lam(0xff2050, { emissive: 0x991030 })), 0, 0.45, 0.21);
    heart.visible = false; hips.add(heart);

    const hammer = new THREE.Group(); hammer.position.y = -0.7; armR.add(hammer);
    hammer.add(at(cyl(0.06, 0.06, 1.1, lam(0x8b5a2b)), 0, -0.45, 0));
    hammer.add(at(box(0.8, 0.48, 0.48, lam(0xff3344)), 0, -1.05, 0));
    hammer.add(at(box(0.12, 0.52, 0.52, lam(0xffd23f)), 0.42, -1.05, 0));
    hammer.add(at(box(0.12, 0.52, 0.52, lam(0xffd23f)), -0.42, -1.05, 0));
    hammer.scale.setScalar(0.001);

    // 부위 → 메쉬
    const parts = {
      head: [head],
      body: [torso],
      arms: [armL.userData.seg, armR.userData.seg],
      hands: [armL.userData.end, armR.userData.end],
      legs: [legL, legR],
    };
    function setPart(p, on) { (parts[p] || []).forEach((m) => { m.visible = on; }); }
    function setRevived(on) {
      for (const k in mats) mats[k].color.setHex(on ? colors[k] : grey);
      faceMat.map = on ? faceOpen : faceClosed;
      faceMat.needsUpdate = true;
      heart.visible = on;
    }
    Object.keys(parts).forEach((p) => setPart(p, false));
    setRevived(false);
    return { root, inner, hips, headG, armL, armR, legL, legR, heart, hammer, parts, setPart, setRevived };
  }

  // ---------------- 조합대 ----------------
  function altar() {
    const g = new THREE.Group();
    g.add(at(box(1.5, 0.3, 2.3, lam(0x9ca3af)), 0, 0.15, 0));
    g.add(at(box(1.6, 0.06, 2.4, lam(0xa78bfa, { emissive: 0x4c1d95 })), 0, 0.33, 0));
    return g;
  }

  // ---------------- 상자 ----------------
  function chest(kind) {
    const g = new THREE.Group();
    const heart = kind === 'heart';
    const wood = lam(heart ? 0xd4a017 : 0x8b5a2b), band = lam(heart ? 0xff4060 : 0xf2c94c);
    g.add(at(box(0.9, 0.5, 0.6, wood), 0, 0.25, 0));
    g.add(at(box(0.08, 0.52, 0.62, band), 0.3, 0.25, 0));
    g.add(at(box(0.08, 0.52, 0.62, band), -0.3, 0.25, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
    lid.add(at(box(0.9, 0.2, 0.6, wood), 0, 0.1, 0.3));
    lid.add(at(box(0.08, 0.22, 0.62, band), 0.3, 0.1, 0.3));
    lid.add(at(box(0.08, 0.22, 0.62, band), -0.3, 0.1, 0.3));
    g.add(at(box(0.14, 0.16, 0.05, band), 0, 0.45, 0.31));
    g.scale.setScalar(heart ? 1.4 : 1.15);
    return { group: g, lid };
  }

  // ---------------- 미니게임 오락기 ----------------
  function station(color) {
    const g = new THREE.Group();
    const body = lam(color), dark = lam(0x222222);
    g.add(at(box(1.3, 1.1, 0.9, body), 0, 0.55, 0));
    g.add(at(box(1.3, 1.0, 0.6, body), 0, 1.6, -0.15));
    g.add(at(box(1.3, 0.12, 0.45, dark), 0, 1.16, 0.22));
    g.add(at(cyl(0.03, 0.03, 0.2, dark, 8), -0.3, 1.3, 0.25));
    g.add(at(sph(0.07, lam(0xff3344), 10), -0.3, 1.42, 0.25));
    g.add(at(cyl(0.06, 0.06, 0.05, lam(0xffd23f), 10), 0.1, 1.24, 0.25));
    g.add(at(cyl(0.06, 0.06, 0.05, lam(0x3ccf7a), 10), 0.32, 1.24, 0.25));
    g.add(at(box(1.34, 0.3, 0.7, lam(0xffd23f, { emissive: 0x553300 })), 0, 2.25, -0.1));
    const tex = U.canvasTexture(256, 192, () => {});
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.set(0, 1.62, 0.152); g.add(screen);
    function setScreen(lines, bg) {
      const c = tex.image, ctx = c.getContext('2d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => { ctx.font = `bold ${i === 0 ? 28 : 34}px "Malgun Gothic", sans-serif`; ctx.fillText(l, c.width / 2, 62 + i * 64); });
      tex.needsUpdate = true;
    }
    return { group: g, setScreen };
  }

  // ---------------- 가구/소품 ----------------
  function decor(type) {
    const g = new THREE.Group();
    const add = (m, x, y, z) => g.add(at(m, x, y, z));
    const woodD = lam(0x6b4423), wood = lam(0x8b5a2b), white = lam(0xf2f2f2), black = lam(0x1a1a1a);
    switch (type) {
      case 'bed':
        add(box(1.7, 0.35, 1.9, wood), 0, 0.18, 0); add(box(1.6, 0.2, 1.8, white), 0, 0.45, 0);
        add(box(1.62, 0.12, 1.1, lam(0xff8fb1)), 0, 0.58, 0.35); add(box(0.7, 0.15, 0.4, lam(0xfff8e0)), 0, 0.62, -0.6);
        add(box(1.7, 0.9, 0.12, wood), 0, 0.45, -0.92); break;
      case 'lamp':
        add(box(0.8, 0.6, 0.7, wood), 0, 0.3, -0.3); add(cyl(0.05, 0.08, 0.3, black), 0, 0.75, -0.3);
        add(cyl(0.12, 0.25, 0.3, lam(0xfff1b0, { emissive: 0x886622 })), 0, 1.0, -0.3); break;
      case 'table':
        add(box(1.4, 0.08, 1.0, wood), 0, 0.75, 0);
        [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([x, z]) => add(box(0.08, 0.75, 0.08, woodD), x, 0.37, z));
        add(cyl(0.2, 0.18, 0.04, white), 0.2, 0.81, 0); add(cyl(0.08, 0.07, 0.2, lam(0x60a5fa)), -0.3, 0.89, 0.1); break;
      case 'plant':
        add(cyl(0.3, 0.22, 0.5, lam(0xc2410c)), 0, 0.25, 0); add(sph(0.45, lam(0x2f9e44)), 0, 0.95, 0); add(sph(0.3, lam(0x37b24d)), 0.1, 1.35, 0); break;
      case 'tree':
        add(cyl(0.18, 0.25, 1.6, lam(0x7c4a21)), 0, 0.8, 0); add(sph(0.9, lam(0x2f9e44)), 0, 2.1, 0); add(sph(0.6, lam(0x40c057)), 0.3, 2.7, 0.1); break;
      case 'tv':
        add(box(1.6, 0.5, 0.5, woodD), 0, 0.25, -0.5); add(box(1.5, 0.9, 0.08, black), 0, 1.0, -0.6);
        add(new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.78), new THREE.MeshBasicMaterial({ color: 0x3355aa })), 0, 1.0, -0.555); break;
      case 'sofa': {
        const red = lam(0xc0392b);
        add(box(1.8, 0.45, 0.9, red), 0, 0.22, 0); add(box(1.8, 0.65, 0.25, red), 0, 0.6, -0.33);
        add(box(0.2, 0.6, 0.9, red), 0.9, 0.3, 0); add(box(0.2, 0.6, 0.9, red), -0.9, 0.3, 0);
        add(box(0.5, 0.35, 0.15, lam(0xfde68a)), -0.4, 0.6, -0.15); break;
      }
      case 'toilet':
        add(cyl(0.25, 0.2, 0.4, white), 0, 0.2, 0.05); add(cyl(0.3, 0.3, 0.08, white), 0, 0.44, 0.1);
        add(box(0.6, 0.6, 0.25, white), 0, 0.7, -0.3); break;
      case 'tub':
        add(box(1.8, 0.6, 0.95, white), 0, 0.3, -0.4); add(box(1.6, 0.02, 0.75, lam(0x66ccff)), 0, 0.56, -0.4);
        add(sph(0.12, lam(0xffd23f), 10), 0.4, 0.62, -0.3); break;
      case 'sink':
        add(box(1.0, 0.8, 0.5, lam(0xa5d8ff)), 0, 0.4, -0.65); add(box(0.8, 0.1, 0.4, white), 0, 0.85, -0.65);
        add(box(0.8, 0.7, 0.04, lam(0xccffff, { emissive: 0x335555 })), 0, 1.6, -0.9); break;
      case 'fridge':
        add(box(0.9, 1.9, 0.8, lam(0xf0f0f0)), 0, 0.95, -0.5); add(box(0.05, 0.6, 0.05, black), 0.32, 1.2, -0.08);
        add(box(0.92, 0.02, 0.82, black), 0, 1.3, -0.5); break;
      case 'stove':
        add(box(1.2, 0.9, 0.8, lam(0xdddddd)), 0, 0.45, -0.5); add(box(1.2, 0.04, 0.8, black), 0, 0.92, -0.5);
        add(cyl(0.28, 0.22, 0.08, lam(0x333333)), -0.25, 0.98, -0.5); add(cyl(0.15, 0.15, 0.25, lam(0x9ca3af)), 0.3, 1.06, -0.5); break;
      case 'counter':
        add(box(1.6, 0.9, 0.8, lam(0xc49a6c)), 0, 0.45, -0.5); add(box(1.65, 0.06, 0.85, lam(0xeeeeee)), 0, 0.93, -0.5);
        add(sph(0.13, lam(0xef4444), 10), -0.4, 1.06, -0.5); add(sph(0.13, lam(0xfacc15), 10), -0.1, 1.06, -0.45); break;
      case 'shoes':
        add(box(1.4, 0.5, 0.4, wood), 0, 0.25, -0.6);
        [[-0.45, 0xef4444], [-0.15, 0x3b82f6], [0.15, 0x22c55e], [0.45, 0xfacc15]].forEach(([x, c]) => add(box(0.22, 0.12, 0.34, lam(c)), x, 0.56, -0.6));
        break;
    }
    return g;
  }

  // 1인칭 손 (쫄라맨: 까만 막대 팔 + 동그란 주먹)
  function hands() {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false });
    const make = (sx) => {
      const h = new THREE.Group();
      const fist = at(sph(0.045, m, 12), sx * 0.3, -0.27, -0.6);
      h.add(fist);
      const a = new THREE.Vector3(sx * 0.5, -0.8, -0.25), b = fist.position.clone();
      const d = new THREE.Vector3().subVectors(b, a);
      const arm = cyl(0.014, 0.014, d.length(), m, 8);
      arm.position.copy(a).addScaledVector(d, 0.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      h.add(arm);
      h.traverse((o) => { o.renderOrder = 1000; });
      return h;
    };
    const L = make(-1), R = make(1);
    g.add(L, R);
    return {
      group: g,
      update(bob, moving) {
        const s = moving ? Math.sin(bob) : 0;
        L.position.y = s * 0.025; R.position.y = -s * 0.025;
      },
    };
  }

  function blob(r) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
    return m;
  }

  G.Models = { kidnapper, zola, nosni, altar, chest, station, decor, hands, blob, dance, resetPose };
})();
