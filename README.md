## MI-használat dokumentációja

### Általános leírás és munkamódszer
A fejlesztés során a **Google Gemini** nyelvi modellt használtam iteratív társfejlesztőként (követelményelemzéshez, kódgeneráláshoz és tesztesetek tervezéséhez). A munka folyamán ellenőriztem az MI által generált javaslatokat, esetekben kiegészítettem, megváltoztattam azokat.
---

## 1. Döntési eset: Követelményelemzés és játékszabályok pontosítása

* **Fejlesztési fázis:** Követelményelemzés és specifikáció (1. mérföldkő)
* **Használt eszköz:** Google Gemini
* **Probléma:** A Torpedó (Warships) játékhoz kellett olyan tömör (max. 4000 karakteres), de egyértelműen tesztelhető specifikációt és 8 számozott elfogadási feltételt készíteni, amely lefedi a normál működést, a határeseteket és a hibás bemeneteket, valamint feloldja a játékszabályokból adódó bizonytalanságokat.
* **Átadott kontextus és utasítás:** Átadtam a tárgyi követelményeket tartalmazó PDF-et, és kértem egy olyan Torpedó specifikációt, ahol a játékos egy kezdetleges Bot ellen játszik, van felhasználókezelés és toplista. Második lépésben visszatöltöttem a saját magam által kibővített specifikációt azzal az utasítással, hogy ellenőrizze a szöveget tartalmi és formai szempontból.
* **Kapott javaslat lényege:** 
  1. Az MI első körben egy szigorúan felváltva következő körökre épülő specifikációt és 8 tesztelhető elfogadási feltételt  javasolt.
  2. Miután átírtam a szabályokat, az MI kiszúrt egy kritikus logikai ellentmondást: a „Bizonytalanságok” fejezetben bevezettem a találat utáni egyszeri extra (bónusz) lövést, viszont a 4. elfogadási feltételben benne maradt az eredeti MI-javaslat, miszerint a Bot minden lövés után azonnal visszalő.
* **Saját döntés:** 
  * Elfogadtam az MI javaslatát a REST API alapú, szerveroldali állapotkezelésre (hogy a kliensoldali csalás kizárt legyen), valamint a seedelhető véletlenszám-generátorral működő Random Botra, mert ez determinisztikusan tesztelhetővé teszi a backendet.
  * Kiegészítettem a specifikációt egy konkrét „A játék működése” fejezettel: definiáltam a pontos állapotgépet (`PREPARE`, `BATTLE`, `FINISHED`), a menüt, valamint az `'R'` billentyűvel történő hajóforgatást, hogy a frontend-backend interfész egyértelmű legyen.
  * Módosítottam az MI eredeti körkezelési javaslatát arra, hogy találat (`HIT`/`SUNK`) esetén a játékos pontosan egyszer újra lőhessen, mert ez jobb játékélményt ad, ugyanakkor a végtelenített bónuszköröknél könnyebben határolhatóak be a tesztesetek. Az MI által jelzett logikai ellentmondást javítottam, és összehangoltam a 4. elfogadási feltételt az új bónuszkör-szabállyal.
* **Ellenőrzés és bizonyíték:** 
  * A véglegesített, ellentmondásmentes követelmények a `specifikacio.md` fájlban találhatók (3. fejezet: játék működése, 5. fejezet 4. pont: bónusz körös elfogadási feltétel).
  * A későbbiekben erre a pontosított 4. és 7. elfogadási feltételre épülnek a fázisváltást és a bónusz lövést ellenőrző automatizált integrációs tesztek.

