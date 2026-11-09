// 맵 배치 (칸 좌표, 1칸 = 2m)
//  순서: 침실 → 거실 → 화장실 → (화장실 열쇠로) 거실 계단 → 1층 → 부엌 → (부엌 열쇠로) 마당 → 미로 → 탈출
G.Rooms = {
  spawn: [2, 4],       // 침실 시작 위치
  yardSpawn: [30, 16], // 마당/미로에서 잡혔을 때 다시 시작하는 위치

  list: [
    {
      id: 'bedroom', name: '침실', icon: '🛏️', level: 2, x0: 1, x1: 8, z0: 1, z1: 7, floor: 'carpet', light: 0xffe6c7,
      minigame: 'whack', part: 'head', station: [4, 1],
      chests: [[8, 1], [1, 7]],
      decor: [{ type: 'bed', x: 1, z: 1 }, { type: 'lamp', x: 2, z: 1 }, { type: 'table', x: 5, z: 5 }, { type: 'plant', x: 8, z: 7 }],
    },
    {
      id: 'living', name: '거실', icon: '🛋️', level: 2, x0: 10, x1: 17, z0: 1, z1: 7, floor: 'wood', light: 0xfff2d0,
      minigame: 'target', part: 'arms', station: [16, 7],
      chests: [[17, 1], [10, 7]],
      decor: [{ type: 'tv', x: 13, z: 1 }, { type: 'sofa', x: 13, z: 3 }, { type: 'plant', x: 10, z: 1 }],
    },
    {
      id: 'bathroom', name: '화장실', icon: '🛁', level: 2, x0: 19, x1: 24, z0: 1, z1: 7, floor: 'tile', light: 0xdff4ff,
      minigame: 'memory', part: 'legs', station: [21, 1],
      chests: [[24, 7], [19, 7]],
      decor: [{ type: 'toilet', x: 19, z: 1 }, { type: 'tub', x: 23, z: 1 }, { type: 'sink', x: 22, z: 7 }],
    },
    {
      id: 'hall', name: '1층', icon: '🚪', level: 1, x0: 9, x1: 18, z0: 13, z1: 19, floor: 'stone', light: 0xffe0b0,
      minigame: 'rhythm', part: 'hands', station: [10, 19],
      chests: [[9, 13], [18, 19]],
      decor: [{ type: 'shoes', x: 18, z: 13 }, { type: 'plant', x: 9, z: 16 }, { type: 'sofa', x: 15, z: 19 }],
    },
    {
      id: 'kitchen', name: '부엌', icon: '🍳', level: 1, x0: 20, x1: 27, z0: 13, z1: 19, floor: 'checker', light: 0xfff0c0,
      minigame: 'timing', part: 'body', station: [23, 19],
      chests: [[27, 13], [20, 19]],
      decor: [{ type: 'fridge', x: 21, z: 13 }, { type: 'stove', x: 22, z: 13 }, { type: 'counter', x: 24, z: 13 }, { type: 'table', x: 24, z: 16 }],
    },
  ],

  // 문: key = 이 문을 여는 열쇠(그 방 상자에서 나옴), room = 문이 있는 방, front = 밖(미로)으로 나가는 문
  doors: [
    { x: 9,  z: 4,  axis: 'x', key: 'bedroom',  room: 'bedroom', to: '거실' },
    { x: 18, z: 4,  axis: 'x', key: 'living',   room: 'living',  to: '화장실' },
    { x: 13, z: 8,  axis: 'z', key: 'bathroom', room: 'living',  to: '계단 → 1층' },
    { x: 19, z: 16, axis: 'x', key: 'hall',     room: 'hall',    to: '부엌' },
    { x: 28, z: 16, axis: 'x', key: 'kitchen',  room: 'kitchen', to: '마당 · 미로', front: true },
  ],

  stairs: { x: 13, z0: 9, z1: 12 },                 // 거실 계단 문 → 1층 (내려가는 경사)
  yard: { x0: 29, x1: 35, z0: 13, z1: 19,           // 부엌 밖 마당
    decor: [{ type: 'tree', x: 29, z: 13 }, { type: 'tree', x: 29, z: 19 }, { type: 'tree', x: 35, z: 13 }, { type: 'tree', x: 35, z: 19 }] },
  maze: { x: 36, z: 11 },                           // 미로 왼쪽 위 모서리
};

G.Rooms.byId = {
  stairs: { id: 'stairs', name: '계단' },
  yard: { id: 'yard', name: '마당' },
  maze: { id: 'maze', name: '미로' },
};
G.Rooms.list.forEach((r, i) => { r.index = i; G.Rooms.byId[r.id] = r; });
