## MI-használat dokumentációja

### Általános leírás és munkamódszer
A fejlesztés során a **Google Gemini** nyelvi modellt használtam iteratív társfejlesztőként (követelményelemzéshez, kódgeneráláshoz és tesztesetek tervezéséhez). A munka folyamán ellenőriztem az MI által generált javaslatokat, esetekben kiegészítettem, megváltoztattam azokat.
---

### 1. Döntési eset: Követelményelemzés és Specifikáció kialakítása

* **Fejlesztési fázis:** Követelményelemzés (1. mérföldkő)
* **Használt eszköz:** Google Gemini
* **Probléma:** A Torpedó (Warships) játékhoz kellett olyan rövid (max. 4000 karakteres), mégis jól tesztelhető specifikációt és 8 elfogadási feltételt készíteni, amely lefedi a normál működést, a határeseteket és a hibás bemeneteket, valamint tisztázza a játékszabályok bizonytalanságait.
* **Kiegészítés:** A játék menetének meghatározása, bizonytalanságok eldöntése.
