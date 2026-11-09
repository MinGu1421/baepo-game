# assets 폴더

## 소리 교체
1. `assets/sounds/` 폴더에 mp3/wav/ogg 파일을 넣어요.
2. `js/config.js`의 `assets.sounds`에 경로를 적어요. 비워두면 내장 효과음이 나와요.

| 이름 | 언제 나오나 |
|---|---|
| music | 기본 노래 "W를 가져가" (기본 경로: assets/sounds/w-song.mp3) |
| chase | 납치범이 가까이 올 때 바뀌는 노래 (기본 경로: assets/sounds/chase.mp3) |
| chestOpen | 상자 열 때 |
| pickup | 아이템 얻을 때 |
| trap | 함정 상자 |
| caught | 권루트에게 잡혔을 때 |
| door | 문 열릴 때 |
| hit / shoot | 미니게임 타격/발사 |
| success / fail | 미니게임 성공/실패 |
| boom | 엔딩 망치 내려칠 때 |
| camera | 셀카폰 찰칵 |

예)
```js
sounds: { music: 'assets/sounds/w-song.mp3', caught: 'assets/sounds/scream.wav', ... }
```

⚠️ `index.html`을 더블클릭으로 열면 일부 브라우저에서 소리 파일이 막힐 수 있어요. 그럴 땐 `serve.ps1`로 실행하세요.

## 이미지/모델 교체
캐릭터는 `js/models.js`에서 기본 도형으로 만들어져 있어요.
- 납치범 얼굴: `drawKidnapperFace()` — 사진을 쓰려면 이 함수 대신 `new THREE.TextureLoader().load('assets/images/kwon.png')`를 얼굴 재질(map)에 넣으면 돼요.
- 노스니 얼굴: `drawNosniFace()`
