# AGENTS.md – Torpedo (Warships) Projekt

## Projektfelépítés

```
Torpedo/
├── AGENTS.md                # Ez a fájl – AI támogató dokumentáció
├── SPECIFIKACIO.md           # Részletes specifikáció
├── README.md                 # Indítási útmutató
├── backend/                  # Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── index.ts          # Express szerver belépési pont
│   │   ├── routes.ts         # HTTP útvonalak (REST API réteg)
│   │   ├── gameLogic.ts      # Tiszta üzleti logika (hajó elhelyezés, lövés, stb.)
│   │   ├── botLogic.ts       # Bot AI logika (seedelhető RNG-vel)
│   │   ├── types.ts          # TypeScript típusdefiníciók
│   │   ├── leaderboard.ts    # Toplista kezelés (JSON fájl perzisztencia)
│   │   └── store.ts          # In-memory játékállapot tároló
│   ├── tests/
│   │   └── game.test.ts      # Automatizált tesztek (AC1–AC7)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── main.tsx          # React belépési pont
│   │   ├── App.tsx           # Fő alkalmazás komponens (routing)
│   │   ├── components/       # UI komponensek
│   │   │   ├── Board.tsx     # 10x10-es tábla megjelenítés
│   │   │   ├── ShipSelector.tsx  # Hajóválasztó panel
│   │   │   ├── Menu.tsx      # Főmenü
│   │   │   ├── Leaderboard.tsx   # Toplista
│   │   │   └── Game.tsx      # Játék nézet (PREPARE / BATTLE / FINISHED)
│   │   ├── api.ts            # Backend API hívások
│   │   └── types.ts          # Frontend típusok
│   ├── package.json
│   └── vite.config.ts
```

## Kódolási konvenciók

- **Nyelv:** TypeScript (strict mode) mind backend, mind frontend oldalon.
- **Architektúra:** Szigorú szeparáció az üzleti logika (`gameLogic.ts`, `botLogic.ts`) és a HTTP réteg (`routes.ts`) között. Az üzleti logika NEM importálhat Express-specifikus modulokat.
- **Dependency Injection:** A Bot RNG-je (véletlenszám-generátor) injektálható. A `GameState.rng` mező tárolja a játékhoz tartozó RNG-t; alapértelmezetten `Math.random`, de a `POST /api/game/new` kérés `seed` mezőjével seedelt (determinisztikus) RNG-re cserélhető (`createSeededRng`). A bot flotta generálása (`generateBotBoard`) és célzása (`executeBotTurn`/`botChooseTarget`) ezt az injektált RNG-t használja, így a tesztek 100%-ban determinisztikusak.
- **Immutabilitás:** A játékállapot módosítása mindig új objektumot ad vissza, vagy a meglévőt mutálja helyben, de a logikai függvények tiszta bemenetet/kimenetet használnak.
- **Típusbiztonság:** Nincs `any` típus a kódban, csak indokolt esetben `unknown`.
- **Hibakezelés:** Az üzleti logika saját hibaüzeneteket dob, a HTTP réteg ezeket fordítja HTTP válaszkódokra.

## Főbb üzleti szabályok

### Játékfázisok
1. **`PREPARE`** – A játékos elhelyezi 5 hajóját (méret: 5, 4, 3, 3, 2). A Bot hajói a fázis végén automatikusan generálódnak.
2. **`BATTLE`** – Körökre osztott lövöldözés. A játékos lő először.
3. **`FINISHED`** – Győztes kihirdetése, toplista mentés (ha a játékos nyert).

### Hajóelhelyezési szabályok
- 10×10-es tábla (X: 0–9, Y: 0–9).
- Hajók vízszintesen (X növekszik) vagy függőlegesen (Y növekszik) helyezhetők el.
- Hajók NEM lóghatnak le a tábláról.
- Hajók NEM fedhetik át egymást.
- Hajók ÉRINTKEZHETNEK egymással (szomszédsági szabály: megengedett).

### Lövési és bónusz kör szabályok
- Érvényes lövés: 0–9 tartomány, még nem lőtt mező.
- **Találat (HIT/SUNK):** A játékos kap pontosan 1 bónusz lövést (a Bot NEM lő vissza).
- **Mellélövés (MISS) VAGY bónusz lövés leadása után:** A játékos köre véget ér, a Bot azonnal lő (és a Bot is kap bónusz lövést, ha talál).
- **Utolsó hajó elsüllyesztése (17. találat):** Azonnali `FINISHED`, nincs további lövés.

### Titkossági szabály
A `BATTLE` fázis alatt a backend SOHA nem küldi el a Bot el nem talált hajóinak koordinátáit a kliensnek. Csak a már meglőtt mezők állapota (`MISS`, `HIT`, `SUNK`) látható.

## Parancsok

### Backend
```bash
cd backend
npm install          # Függőségek telepítése
npm run build        # TypeScript fordítás
npm run start        # Szerver indítása (port 3001)
npm run dev          # Fejlesztői mód (ts-node-dev)
npm test             # Automatizált tesztek futtatása
```

### Frontend
```bash
cd frontend
npm install          # Függőségek telepítése
npm run dev          # Fejlesztői szerver indítása (port 5173)
npm run build        # Produkciós build
```

### Tesztek
```bash
cd backend
npm test             # Összes teszt futtatása (AC1–AC7 + determinisztikus bot)
```

A tesztek Vitest + Supertest alapúak (`backend/tests/game.test.ts`), minden elfogadási
feltétel `// AC1`, `// AC2`, … kommenttel jelölt. Az AC8 (UI megjelenítés) kézi tesztelést
igényel – a reprodukálható lépések a `README.md`-ben találhatók.

### Előfeltétel
A tesztek és a futtatás Node.js 18+ és npm meglétét igénylik (`node -v`, `npm -v`).
Ha nincs telepítve: `winget install OpenJS.NodeJS.LTS` (Windows), majd új terminál.

## Változtatási igények kezelése (Change Request)

Az üzleti logika (`gameLogic.ts`) és a HTTP réteg (`routes.ts`) szigorú szeparációja biztosítja, hogy:
- Új játékszabály hozzáadása (pl. új hajótípus, más bónusz szabály) csak a `gameLogic.ts` módosítását igényli.
- API struktúra változtatása csak a `routes.ts` és frontend `api.ts` módosítását igényli.
- Bot viselkedés változtatása csak a `botLogic.ts` módosítását igényli.
- Perzisztencia változtatása (JSON → SQLite) csak a `leaderboard.ts` módosítását igényli.
