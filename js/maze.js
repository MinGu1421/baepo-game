// 미로 생성 (깊이우선 탐색 + 약간의 샛길)
// 결과 grid[z][x]: 1 = 벽, 0 = 길. 실제 칸은 (홀수, 홀수) 좌표.
G.Maze = {
  generate(cols, rows, extra) {
    rows = Math.max(5, rows);
    const W = cols * 2 + 1, H = rows * 2 + 1;
    const grid = [];
    for (let z = 0; z < H; z++) grid.push(new Array(W).fill(1));

    const visited = new Set();
    const key = (x, z) => x + ',' + z;
    const stack = [[0, 0]];
    visited.add(key(0, 0));
    grid[1][1] = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (stack.length) {
      const [cx, cz] = stack[stack.length - 1];
      const options = G.U.shuffle(dirs.slice()).filter(([dx, dz]) => {
        const nx = cx + dx, nz = cz + dz;
        return nx >= 0 && nz >= 0 && nx < cols && nz < rows && !visited.has(key(nx, nz));
      });
      if (!options.length) { stack.pop(); continue; }
      const [dx, dz] = options[0];
      const nx = cx + dx, nz = cz + dz;
      grid[cz * 2 + 1 + dz][cx * 2 + 1 + dx] = 0;
      grid[nz * 2 + 1][nx * 2 + 1] = 0;
      visited.add(key(nx, nz));
      stack.push([nx, nz]);
    }

    // 샛길(순환로)을 조금 뚫어 술래를 따돌릴 수 있게
    for (let z = 1; z < H - 1; z++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[z][x] !== 1) continue;
        const between = (x % 2 === 0 && z % 2 === 1) || (x % 2 === 1 && z % 2 === 0);
        if (between && Math.random() < extra) grid[z][x] = 0;
      }
    }
    return { W, H, grid };
  },
};
