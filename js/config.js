// =====================================================================
//  게임 설정 파일 — 숫자만 바꿔도 난이도/분량을 조절할 수 있어요.
// =====================================================================
window.G = window.G || {};

G.CONFIG = {
  title: 'W의 방탈출',

  cellSize: 2,          // 바닥 한 칸 크기(미터)
  wallHeight: 3,        // 집 벽 높이(한 층)
  floor2Height: 3.6,    // 2층 바닥 높이 (계단으로 내려감)
  mazeWallHeight: 4.6,  // 미로 벽 높이
  mazeWallThickness: 0.5, // 미로 벽 두께(칸 대비 비율, 작을수록 길이 넓어짐)
  propHitbox: 0.62,     // 상자/가구 충돌 크기(칸 대비 비율)
  mazeHurdles: 10,      // 미로에 놓이는 점프 장애물(통나무) 개수
  eyeHeight: 1.6,       // 플레이어 눈 높이

  // 실시간 리더보드 (Supabase). key는 공개용(publishable) 키라 코드에 있어도 안전해요.
  // 테이블 권한: 누구나 조회·기록 추가만 가능 (수정·삭제 불가)
  supabase: {
    url: 'https://pnwzpicrweiawbakimhz.supabase.co',
    key: 'sb_publishable_IRsNs7VeiWxTiZJ5VOliwA_Rll7jWYy',
    table: 'booth_leaderboard',
  },

  lives: 3,             // 시작 목숨 수
  timeLimit: 480,       // 제한 시간(초) — 8분 안에 탈출 못하면 게임오버

  player: {
    walkSpeed: 4.2,     // 걷기 속도
    runSpeed: 6.8,      // 달리기 속도 (Shift)
    radius: 0.25,       // 몸 두께(벽 충돌)
    jumpSpeed: 6.0,     // 점프 힘 (스페이스바)
    gravity: 18,        // 중력
    staminaMax: 100,
    staminaDrain: 26,
    staminaRegen: 16,
    mouseSensitivity: 0.0022,
  },

  // 난이도 — 시작 화면에 "무엇이 업그레이드됐는지" 표시돼요
  difficulty: {
    easy:   { label: '쉬움',   enemySpeed: 2.6, catchUp: 1.2, startSafeTime: 8 },
    normal: { label: '보통',   enemySpeed: 3.4, catchUp: 1.3, startSafeTime: 6 },
    hard:   { label: '어려움', enemySpeed: 4.3, catchUp: 1.45, startSafeTime: 4 },
  },
  defaultDifficulty: 'normal',

  enemy: {
    catchDistance: 1.0,     // 이 거리 안으로 붙으면 잡힘
    respawnSafeTime: 4,     // 잡힌 뒤 납치범 대기 시간(초)
    mazeEnterSafeTime: 4,   // 마당/미로에 처음 나왔을 때 대기 시간(초)
    minigameInvuln: 1,      // 미니게임 끝난 뒤 무적 시간(초)
    farPathCells: 14,       // 이 칸 수보다 멀면 catchUp 배수로 빨라짐
    dangerDistance: 12,     // 이 거리 안이면 화면이 붉어짐
  },

  // 음악: 납치범이 가까워지면(위험도 chaseOn 이상) 추격 음악으로 바뀜
  music: { chaseOn: 0.45, chaseOff: 0.2, volume: 0.5 },

  // 셀카폰: Q키로 사용 → 납치범 위치/방향 표시
  selfie: { duration: 6, cooldown: 10 },

  // 나쁜 상자(함정) 종류 — enabled:false 로 끄거나 시간을 바꿀 수 있어요
  traps: {
    summon: { enabled: true, grace: 1.2, label: '납치범이 바로 옆에 소환됐다! 도망쳐!' },
    flash:  { enabled: true, duration: 2, label: '셀카폰이 오작동하는 것 같다...!' }, // 플래시에 눈부심
    slow:   { enabled: true, duration: 6, factor: 0.45, label: '발이 무거워졌다...' },
  },

  // 방마다 놓이는 상자 내용물 (위치는 rooms.js, 순서는 매 판 섞임)
  chests: {
    bedroom:  ['key', 'selfie'],
    living:   ['key', 'trap'],
    bathroom: ['key', 'selfie'],
    hall:     ['key', 'trap'],
    kitchen:  ['key', 'trap'],
    maze:     ['selfie', 'trap', 'selfie', 'trap'],
  },

  // 미로 크기(칸 수). 매 판 새로 랜덤 생성돼요.
  maze: { cols: 10, rows: 9, extraOpenings: 0.1 },

  // 미니게임 목표 (목표를 달성하면 바로 자동으로 나가고 보상을 받아요)
  minigames: {
    whack:  { time: 30, goal: 15 },              // 침실: 납치범 잡기
    target: { time: 30, goal: 100 },             // 거실: 과녁 맞추기
    memory: { rounds: 5, startLength: 3 },       // 화장실: 순서 기억
    rhythm: { notes: 30, goal: 10, bpm: 120 },   // 1층: W를 가져가 리듬
    timing: { tries: 5, goal: 4, speed: 1.0 },   // 부엌: 계란 뒤집기
  },

  // 노스니 신체 부위 (방 미니게임 보상)
  parts: {
    head:  { label: '머리', icon: '🙂' },
    arms:  { label: '팔',   icon: '💪' },
    legs:  { label: '다리', icon: '🦵' },
    hands: { label: '손',   icon: '🖐️' },
    body:  { label: '몸통', icon: '👕' },
  },

  // 소리 파일: 아래 경로에 파일을 넣으면 그 파일이 재생돼요. 없으면 내장 합성음.
  //   music = 기본 노래("W를 가져가"), chase = 납치범이 가까이 올 때 노래
  assets: {
    sounds: {
      music: 'assets/sounds/w-song.mp3',
      chase: 'assets/sounds/chase.mp3',
      chestOpen: '', pickup: '', trap: '', caught: '', door: '',
      hit: '', shoot: '', success: '', fail: '', boom: '', camera: '', jump: '',
    },
  },
};
