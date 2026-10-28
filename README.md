# Torpedó (Warships) – Webes játék

Körökre osztott Torpedó (Battleship) játék egy gépi ellenfél (Bot) ellen.
A projekt két részből áll:

- **backend/** – Node.js + Express + TypeScript REST API (üzleti logika, szabályellenőrzés, bot, toplista).
- **frontend/** – React + Vite + TypeScript webes felület.

A játékállapotot teljes egészében a szerver kezeli, így a kliensoldali manipuláció kizárt.
A `BATTLE` fázis alatt a backend SOHA nem küldi el a Bot el nem talált hajóinak koordinátáit.

---

## Előfeltételek

- **Node.js 18+** és **npm** (a `node -v` és `npm -v` parancsoknak működniük kell).
  - Windows-on telepítés pl.: `winget install OpenJS.NodeJS.LTS` (új terminál szükséges utána),
    vagy töltsd le a <https://nodejs.org> oldalról.

---

## Telepítés

A projekt gyökeréből egyetlen paranccsal telepíthető minden függőség:

```bash
npm install

```

## Futtatás

### Backend (REST API, port 3001)

```bash
cd backend
npm run dev      # fejlesztői mód (automatikus újraindítás)
# vagy produkciós build + indítás:
npm run build
npm run start
```

A backend a `http://localhost:3001` címen figyel.

### Frontend (webes UI, port 5173)

```bash
cd frontend
npm run dev
```

Nyisd meg a böngészőben: <http://localhost:5173>.
A Vite dev szerver a `/api` kéréseket automatikusan a backendre (`http://localhost:3001`) proxyzza,
ezért a backendnek is futnia kell a játékhoz.

Produkciós build:

```bash
cd frontend
npm run build
```

---

## Automatizált tesztek (AC1–AC7)

A tesztek a backendben találhatók (`backend/tests/game.test.ts`), Vitest + Supertest alapon.
Minden elfogadási feltétel `// AC1`, `// AC2`, … kommentekkel van jelölve.

```bash
cd backend
npm test         # az összes teszt egyszeri lefuttatása (vitest run)
```

Lefedett elfogadási feltételek:

| AC  | Leírás                                                   | Teszt típus            |
| --- | -------------------------------------------------------- | ---------------------- |
| AC1 | Normál hajóelhelyezés `(2,2)` vízszintes 4-es hajó       | unit + API             |
| AC2 | Tábla széle `(7,0)` és hajók érintkezése engedélyezett   | unit                   |
| AC3 | Lelógó `(8,0)` / átfedő hajó → `400`                     | unit + API             |
| AC4 | Találat → bónusz lövés, Mellé/bónusz után Bot válasz     | integrációs            |
| AC4 | Determinisztikus, seedelhető Bot RNG                     | unit + integrációs     |
| AC5 | Utolsó hajó elsüllyesztése → `FINISHED` + toplista       | integrációs            |
| AC6 | Dupla lövés / pályán kívüli célzás → `400`, állapot áll  | unit + API             |
| AC7 | Fázissértés (lövés `PREPARE`/`FINISHED` alatt) → `400`   | integrációs            |

---

## AC8 – UI megjelenítés kézi reprodukálása

**Elfogadási feltétel (AC8):** A saját táblán látszanak a saját hajók és a Bot lövései;
a Bot tábláján a hajók rejtve maradnak, és csak a már meglőtt mezők állapota (víz/találat/süllyedt) látszik.

Reprodukálható lépések:

1. Indítsd el a backendet: `cd backend && npm run dev`.
2. Indítsd el a frontendet: `cd frontend && npm run dev`, majd nyisd meg a <http://localhost:5173> címet.
3. A **belépés** képernyőn adj meg egy felhasználónevet, majd kattints a **Belépés** gombra.
4. A **menüben** válaszd az **Új játék** lehetőséget.
5. **PREPARE fázis:** válassz hajót a jobb oldali listából (az első automatikusan ki van jelölve),
   az `R` billentyűvel forgathatod vízszintes/függőleges irányba, majd kattints az **Elhelyezés**
   táblára a hajó bal/felső sarkának pozíciójához. Helyezd el mind az 5 hajót.
6. Kattints a **Csata indítása!** gombra → a fázis `BATTLE`-re vált.
7. **Ellenőrzés – saját tábla (bal oldal):** láthatók a saját elhelyezett hajóid.
   Amikor a Bot visszalő, a találatait/mellélövéseit is ezen a táblán látod.
8. **Ellenőrzés – ellenség táblája (jobb oldal):** a Bot hajói **NEM** látszanak.
   Kattints egy cellára: csak a lövésed eredménye jelenik meg (💨 víz / 💥 találat / 🔥 süllyedt).
   Üres (még nem lőtt) cellák semlegesek maradnak, nincs „kiszivárgó” hajóinformáció.
9. (Opcionális technikai ellenőrzés) A böngésző hálózati paneljén nézd meg a
   `GET /api/game/:id` választ `BATTLE` alatt: a `botBoard.ships` értéke `undefined` /
   hiányzik, csak a `botBoard.shots` tartalmaz adatot.
10. Nyerj (süllyeszd el mind a 17 bot-mezőt) → a fázis `FINISHED`, a győzelem bekerül a
    **Toplista** nézetbe (legkevesebb lövés előre rangsorolva).

---

## Determinisztikus (seedelt) játék

A Bot véletlenszám-generátora injektálható. Ha a `POST /api/game/new` kérés testében megadsz egy
numerikus `seed` mezőt, a bot flotta generálása és célzása determinisztikussá válik
(ugyanaz a seed → ugyanaz a bot viselkedés). Ezt használják az automatizált tesztek is.

```bash
curl -X POST http://localhost:3001/api/game/new \
  -H "Content-Type: application/json" \
  -d '{"username":"tester","seed":42}'
```

---

## Tesztelés és hibafeltárás (Testing & Defect Discovery)

Ez a szakasz egy szándékosan bevitt hibát és annak javítását mutatja be, demonstrálva, hogy
az automatizált tesztek valóban kiszűrik a hibás viselkedést. A példa az **AC3** határérték-ellenőrzést
célozza: a hajó akkor érvénytelen, ha bármelyik mezője kilóg a `0–9` tartományból.

> Megjegyzés: az alábbi terminálkimenetek az `backend/` könyvtárban futtatott `npm test`
> parancs reprezentatív kimenetei (Vitest). A hiba és a javítás a tényleges
> `validateShipPlacement` függvényt és a meglévő AC3 teszteket érinti
> (`backend/src/gameLogic.ts`, `backend/tests/game.test.ts`).

### A hiba: off-by-one a határérték-ellenőrzésben

A `validateShipPlacement` a `backend/src/gameLogic.ts` fájlban a mező koordinátáit ellenőrzi.
A tábla érvényes indexei `0`-tól `9`-ig tartanak (`BOARD_SIZE = 10`), tehát a `10` index már
a pályán kívül esik. A hibás verzió a felső határt tévesen `<= BOARD_SIZE`-ként ellenőrzi,
ezáltal a `10` indexet is érvényesnek fogadja el:

```ts
// HIBÁS (off-by-one): a 10-es index (pályán kívül) tévesen átmegy
if (x < 0 || x > BOARD_SIZE || y < 0 || y > BOARD_SIZE) {
  return { valid: false, positions: [], error: `Ship extends outside the board at (${x}, ${y})` };
}
```

Mivel `x > 10` helyett `x > BOARD_SIZE` (azaz `x > 10`) a feltétel, egy `(8,0)` kezdetű, 3 hosszú
vízszintes hajó (`x = 8, 9, 10`) hibásan érvényesnek minősül – noha a `10`-es oszlop nem létezik.

### A javítás: szigorú `<` összehasonlítás

```ts
// HELYES: a 10-es index pályán kívülinek számít (0..9 az érvényes tartomány)
if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
  return { valid: false, positions: [], error: `Ship extends outside the board at (${x}, ${y})` };
}
```

### Megbukó tesztfutás a hiba jelenlétében

```text
$ npm test

 RUN  v1.2.0 /Torpedo/backend

 ✓ AC1 – Normal ship placement (2)
 ✓ AC2 – Edge placement and adjacency (3)
 ❯ AC3 – Invalid placement (overflow and overlap) (6)
   × should reject ship placement that extends outside the board (unit)
   × should throw when placeShip extends outside the board
   × should return 400 via API when ship extends outside the board

 FAIL  tests/game.test.ts > AC3 – Invalid placement > should reject ship placement that extends outside the board (unit)
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/game.test.ts:181:29
    179|     const board = createEmptyBoard();
    180|     const validation = validateShipPlacement(board, 3, { x: 8, y: 0 }, 'horizontal');
    181|     expect(validation.valid).toBe(false);
       |                             ^
    182|     expect(validation.error).toBeDefined();

 Test Files  1 failed (1)
      Tests  3 failed | 20 passed (23)
```

A teszt pontosan azt fogja meg, amit az AC3 előír: a `(8,0)` kezdetű 3-as hajó elutasítását.
A hibás `<= BOARD_SIZE` feltétel miatt a `validation.valid` tévesen `true`, ezért a teszt megbukik.

### Sikeres tesztfutás a javítás után

```text
$ npm test

 RUN  v1.2.0 /Torpedo/backend

 ✓ AC1 – Normal ship placement (2)
 ✓ AC2 – Edge placement and adjacency (3)
 ✓ AC3 – Invalid placement (overflow and overlap) (6)
 ✓ AC4 – Shooting, bonus shot, and bot response (4)
 ✓ AC4 (determinism) – Seedable bot RNG (3)
 ✓ AC5 – Last ship sunk, game over (1)
 ✓ AC6 – Invalid shots (duplicate and out of bounds) (4)
 ✓ AC7 – Phase violation (3)

 Test Files  1 passed (1)
      Tests  23 passed (23)
```

### Gyökérok és miért elégíti ki az elfogadási feltételt

- **Gyökérok:** klasszikus *off-by-one* hiba. A `BOARD_SIZE = 10` a mezők *számát* jelöli,
  nem a legnagyobb érvényes indexet. Az érvényes indextartomány `0..9`, ezért a felső határt
  `index >= BOARD_SIZE` (azaz `index >= 10`) esetén kell elutasítani. A `index > BOARD_SIZE`
  (`index > 10`) feltétel egy teljes oszlopnyi/sornyi pályán kívüli indexet (`10`) átengedett.
- **Miért jó a javítás:** a `>=` használata a `10`-es indexet pályán kívülinek minősíti,
  így a `(8,0)` kezdetű 3-as hajó (`x = 8, 9, 10`) elutasításra kerül. Ez pontosan az **AC3**
  elvárása („Lelógó hajó → `400 Bad Request`, a tábla állapota nem változik”). A HTTP rétegben
  a `routes.ts` a `validateShipPlacement`/`placeShip` által dobott hibát `400`-ra fordítja, így
  az AC3 API-teszt is zöld lesz. Fontos, hogy a `(7,0)` kezdetű 3-as hajó (`x = 7, 8, 9`) továbbra
  is érvényes marad, ami az **AC2** határesetet (pontosan a tábla széléig érő hajó) sem sérti.

---

## MI-használat dokumentációja

### Általános leírás és munkamódszer
A fejlesztés során több MI-eszközt használtam iteratív társfejlesztőként (követelményelemzéshez,
kódgeneráláshoz és tesztesetek tervezéséhez). A munka folyamán ellenőriztem az MI által generált
javaslatokat, és ahol szükséges volt, kiegészítettem vagy megváltoztattam azokat. Az alábbi három
döntési eset a hivatalos értékelési szempontok szerint dokumentálja a legfontosabb MI-támogatott
döntéseket.

---

### 1. Döntési eset: Követelmények és a bónusz kör logikája

- **Fejlesztési fázis:** Követelményelemzés (1. mérföldkő).
- **Használt eszköz:** Google Gemini.
- **Probléma:** Rövid (max. 4000 karakteres), mégis jól tesztelhető elfogadási feltételek (AC-k)
  megfogalmazása, és a játékszabályok bizonytalanságainak feloldása.
- **Kontextus és prompt:** Az egyetemi értékelési PDF és a kezdeti Torpedó (Battleship) javaslat
  képezte a bemenetet, amelyet a felhasználó által definiált egyedi mechanika (bónusz lövés)
  érvényesítése követett.
- **MI javaslata:** Kezdetben szigorúan felváltva következő köröket javasolt. Amikor a felhasználó
  bevezette a találatra járó bónusz lövést, az MI felismerte, hogy ez ellentmondásban áll az AC4
  azonnali bot-ellenlépésével (a bónusz lövés alatt a botnak nem szabad visszalőnie).
- **Döntés és indoklás:** Megtartottuk a seedelhető RNG-t a determinisztikus teszteléshez,
  bevezettük a körönként pontosan egy bónusz lövést a jobb játékélményért, és az AC4-et
  összehangoltuk a bónusz kör mechanikájával (találat → bónusz lövés, bot nem lő; mellé vagy a
  bónusz leadása után → a bot azonnal válaszol ugyanabban az API-körben).
- **Bizonyíték:** `SPECIFIKACIO.md` 3., 5. és 6. szakasza (fázisok, AC4/AC5 elfogadási feltételek,
  a bizonytalanságok feloldása: érintkezés megengedett, körönként egy bónusz lövés, seedelt RNG).

---

### 2. Döntési eset: Architektúra és tábla-titkosság (csalás elleni védelem)

- **Fejlesztési fázis:** Implementáció (2. mérföldkő).
- **Használt eszköz:** Google Antigravity (Claude 4.6 Thinking).
- **Probléma:** Annak megakadályozása, hogy a játékos a böngésző Network (hálózati) fülén
  megtekintse a Bot rejtett hajóit a `BATTLE` fázis alatt.
- **Kontextus és prompt:** Projektgenerálás a `SPECIFIKACIO.md` alapján, az állapotintegritás
  (szerveroldali állapotkezelés) hangsúlyozásával.
- **MI javaslata:** Először azt javasolta, hogy a szerver küldje el a teljes állapotot, és a
  hajók elrejtése csak a kliens UI-ban történjen.
- **Döntés és indoklás:** A kliensoldali elrejtést biztonsági okból elvetettük (a hálózati válasz
  továbbra is kiszivárogtatná a koordinátákat). Helyette szerveroldali szűrőt vezettünk be: a
  `serializeGameForClient()` függvény a `BATTLE` fázisban egyáltalán nem szerializálja a Bot
  el nem talált hajóinak koordinátáit – a `botBoard.ships` csak `FINISHED` állapotban kerül a
  válaszba, egyébként hiányzik. Így a rejtett koordináták soha nem hagyják el a szervert HTTP-n.
- **Bizonyíték:** `backend/src/routes.ts` `serializeGameForClient()` függvénye (a `botShips`
  csak `phase === 'FINISHED'` esetén kerül a válaszba), valamint az AC8 kézi teszt 9. lépése
  (a `GET /api/game/:id` válaszban a `botBoard.ships` `BATTLE` alatt hiányzik).

---

### 3. Döntési eset: Determinisztikus Bot az automatizált tesztekhez

- **Fejlesztési fázis:** Tesztelés (2. mérföldkő).
- **Használt eszköz:** Kiro Student.
- **Probléma:** A véletlenszerű bot-lövések miatt „flaky” (megbízhatatlan, néha megbukó)
  integrációs tesztek.
- **Kontextus és prompt:** A Vitest tesztkészlet kiegészítése a meglévő interfészek alapján.
- **MI javaslata:** Injektálható, seedelhető pszeudo-véletlenszám-generátor bevezetése.
- **Döntés és indoklás:** Elfogadtuk a seedelhető RNG ötletét, de a konkrét megvalósításban
  egy lineáris kongruens generátort (LCG) használunk (`createSeededRng`), amelyet nem konstruktoron,
  hanem **paraméter-injektálással** adunk át a bot-függvényeknek (`generateBotBoard(rng)`,
  `botChooseTarget(board, rng)`, `executeBotTurn(board, rng)`). A játékállapot a `GameState.rng`
  mezőben tárolja a generátort, amelyet a `POST /api/game/new` `seed` paramétere állíthat be.
  Ez 100%-ban megismételhető automatizált tesztfutást garantál az AC4 és AC5 esetekhez.
- **Bizonyíték:** `backend/tests/game.test.ts` „AC4 (determinism) – Seedable bot RNG” tesztcsoport,
  valamint a `backend/src/botLogic.ts` `createSeededRng` és a `RngFunction` injektálása.
