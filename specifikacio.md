# Házi feladat specifikáció: Webes Torpedó (Warships) Játék

## 1. Cél és Architektúra
A projekt célja egy webes, körökre osztott Torpedó (Battleship) játék fejlesztése, amelyben a játékos egy kezdetleges algoritmussal működő gépi ellenfél (Bot) ellen játszik. A rendszer tartalmaz felhasználókezelést és egy toplistát, amely a győzelmeket a felhasznált lövések száma alapján rangsorolja.

- **Technológia és felépítés:** Különálló Frontend (webes UI, játékállapot vizuális megjelenítése) és REST API alapú Backend (üzleti logika, szabályellenőrzés, bot lépésgenerálás, állapot- és adattárolás). A játékállapotot a szerver kezeli, így a kliensoldali manipuláció kizárt.

## 2. Szerepkörök
- **Játékos (Bejelentkezett felhasználó):** Felhasználónévvel belépő szereplő, aki elhelyezi a flottáját, lövéseket ad le a Bot táblájára, és eredményei felkerülnek a toplistára.
- **Gépi ellenfél (Bot):** A backend által vezérelt szereplő. Kezdetben véletlenszerűen generált (szabályos) flottával rendelkezik, és a játékos köre után automatikusan visszalő egy még nem célzott mezőre.
- **Vendég:** Regisztráció/belépés nélküli látogató, aki csak a nyilvános toplistát tekintheti meg.

## 3. A játék működése
- **Vizuális megjelenés:** A felhasználó számára két tábla látszik:
    1. A saját táblája, amin a hajói vannak/el lesznek helyezve.
    2. Az ellenfél (Bot) táblája, amin azt látja, hogy hova lőtt eddig és hol volt találat.
- **A játék fázisai:**
    1. `PREPARE`: Ebben a fázisban tudja a felhasználó elhelyezni a hajókat a tábláján.
    2. `BATTLE`: Ez a körökre osztott fázis, amiben a felhasználó és a Bot felváltva leadják lövéseiket.
    3. `FINISHED`: A játék kihirdeti a győztest, és a felhasználó választhat az új játék opció, illetve a menübe való visszatérés között.
- **A menü:** Két opciót ajánl fel a felhasználónak:
    1. Új játék
    2. Toplista megtekintése
- **Hajó lehelyezése:** A `PREPARE` fázisban a felhasználó a tábla mellett található hajó ikonokra kattintva tud választani, melyik hajót helyezi el. Alapvetően horizontálisan, a hajó bal szélén van a kurzor, az `'R'` billentyűvel tudja forgatni a hajót a felhasználó.
- **Lövés leadása:** A `BATTLE` fázisban a felhasználó az ellenfél táblájának egy cellájára kattintva tud lőni. Ha olyan mezőre kattint, ahova már lőtt, akkor megmarad a lövése.

## 4. Főbb forgatókönyvek
1. **Hitelesítés és toplista:** A felhasználó megadja a felhasználónevét (belépés/regisztráció), megtekinti az eddigi legjobb eredményeket (legkevesebb lövéssel elért győzelmek), majd új játékot indít.
2. **Előkészület (Hajók elhelyezése):** A játékos a 10x10-es (X: 0-9, Y: 0-9) tábláján elhelyezi az 5 darab hajóját (méretek: 5, 4, 3, 3, 2 egység) vízszintes vagy függőleges irányban. A backend validálja az elhelyezést, majd legenerálja a Bot flottáját.
3. **Játékmenet (Csata):** A játékos kiválaszt egy célkoordinátát a Bot tábláján. A backend kiértékeli a lövést (Találat / Süllyedt / Mellé). Találat esetén a játékos kap még egy (bónusz) lövést. Mellélövés esetén (vagy a bónusz lövés leadása után) a backend azonnal végrehajtja a Bot válaszlövését, és visszaadja a frissített állapotot.
4. **Játék vége:** Amikor valamelyik fél összes hajója (17 mező) elsüllyed, a játék lezárul. Játékos győzelme esetén az eredmény (felhasználónév, lövésszám, dátum) mentésre kerül a toplistába.

## 5. Elfogadási feltételek és ellenőrzési módok
1. **Normál működés - Hajó elhelyezése:** Ha a játékos egy 4 egység hosszú hajót a `(2, 2)` kezdőkoordinátára vízszintesen helyez el üres táblán, a rendszer elfogadja azt, és a `(2,2), (3,2), (4,2), (5,2)` mezőket foglaltként rögzíti. *(Ellenőrzés: Automatizált unit teszt)*
2. **Határeset - Tábla széle és érintkezés:** Ha a játékos egy 3 egység hosszú hajót a `(7, 0)` koordinátától vízszintesen (a `(7,0), (8,0), (9,0)` mezőkre, közvetlenül a jobb felső sarokig), vagy egy meglévő hajóval közvetlenül szomszédos mezőre helyez el, a rendszer érvényesként fogadja el. *(Ellenőrzés: Automatizált unit teszt)*
3. **Hibás bemenet - Lelógó hajó vagy átfedés:** Ha a játékos egy 3 egységes hajót a `(8, 0)` koordinátától vízszintesen próbál elhelyezni (a 10-es index kilóg a `0-9` tartományból), vagy olyan mezőre, ahol már van hajó, a backend `400 Bad Request` hibát ad vissza, és a tábla állapota nem változik. *(Ellenőrzés: Automatizált unit teszt)*
4. **Normál működés - Lövés, bónusz kör és Bot válaszlépés:** Ha a játékos `BATTLE` fázisban egy még nem lőtt koordinátára lő és talál (`HIT`/`SUNK`), a Bot nem lép, és a játékos pontosan egyszer újra lőhet. Ha a játékos elsőre mellélő (`MISS`), vagy leadta a második (bónusz) lövését is, a backend a válaszban visszaadja a Bot válaszlövését is. *(Ellenőrzés: Automatizált integrációs teszt)*
5. **Határeset - Utolsó hajó elsüllyesztése és győzelem:** Ha a játékos eltalálja a Bot utolsó megmaradt hajójának utolsó ép elemét, a játék státusza `FINISHED` (Győztes: Játékos) állapotba vált, nincs további lövés, és az eredmény bekerül a toplistába. *(Ellenőrzés: Automatizált integrációs teszt)*
6. **Hibás bemenet - Dupla lövés vagy pályán kívüli célzás:** Ha a játékos olyan koordinátára lő, amelyre korábban már lőtt, vagy amely kívül esik a `0-9` tartományon (pl. `(-1, 5)` vagy `(10, 2)`), a backend hibaüzenettel elutasítja a kérést, a játékos lövése megmarad, és a Bot nem lép. *(Ellenőrzés: Automatizált unit teszt)*
7. **Hibás művelet - Fázis megsértése:** Ha a játékos akkor küld lövési kérést a szervernek, amikor a játék még a `PREPARE` fázisban van (nincs mind az 5 hajó elhelyezve), vagy a játék már `FINISHED` állapotú, a szerver elutasítja a műveletet. *(Ellenőrzés: Automatizált integrációs teszt)*
8. **Normál működés - UI megjelenítés:** A webes felületen a játékos saját tábláján látszódnak a saját hajói és a Bot lövései, míg a Bot tábláján a hajók rejtve maradnak, és csak a játékos által már meglőtt mezők állapota (víz/találat/süllyedt) látható. *(Ellenőrzés: Kézi tesztelés reprodukálható lépésekkel)*

## 6. Lényeges bizonytalanságok és feloldásuk
- **Hajók érintkezése (Szomszédsági szabály):** A játék egyes változataiban tiltják a hajók érintkezését. Ebben a projektben ez megengedett, csak az átfedés tiltott.
- **Találat utáni extra kör:** Egyes változatokban találat esetén a játékos újra lőhet. Ebben a projektben a játékos (és a Bot is) találat után körönként pontosan egyszer lőhet újra.
- **Bot intelligencia szintje:** Kérdéses a gép "okossága". Az egyszerűség kedvéért a Bot véletlenszerűen fog választani célmezőt azon mezők közül, amikre még nem tüzelt. Ezt lehet determinisztikusan is tesztelni (seedelt véletlenszám-generátorral).
- **Félbehagyott játékok és adatok kezelése:** Az oldal frissítésekor, mivel a backend memóriában tárolja az aktuális játékállapotot, folytatható a meccs; a toplista eredmények pedig tartósan (fájlban/adatbázisban) kerülnek mentésre.