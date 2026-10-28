# CLAUDE.md – Truppen

Webbläsarspel (crowd-runner/shooter) utan byggsteg och utan beroenden. Allt ligger i roten:
- `index.html` – skal, HUD och alla overlays (meny, paus, död, förråd, förmåga, bestiarium)
- `style.css` – UI-stil, ljust/mörkt läge via CSS-variabler på `:root`
- `game.js` – hela spelet i en IIFE, ritas på `<canvas>`

Ägaren uppdaterar ofta från mobilen. Håll ändringar små och fokuserade, committa med tydliga meddelanden på svenska.

## Regler

- **Allt UI-språk är svenska.** Typografiska tecken i text som visas: ’ och ” ”, minustecken − (U+2212) i siffror som “−5”.
- **Inga beroenden, inget byggsteg.** Inga npm-paket i spelet. Inget laddas externt. Typsnitten Bungee och Figtree ligger i `fonts/` (SIL OFL, licenstexten bredvid) och laddas via `@font-face` i `style.css`. Länka inte till Google Fonts, det skickar besökarens IP-adress till Google.
- **Ingen pay-to-win, inga annonser, inga riktiga köp.** Mynt tjänas bara i spelet.
- **Sparning:** `localStorage`-nycklarna `truppen-v3` (pågående omgång), `truppen-meta` (förmågor, rekord, bestiarium), `truppen-parent` (föräldraläge) och `truppen-sound` (musik/ljud på eller av). Ändra inte formatet utan migrering – spelare har sparad progress. Lägg till nya fält med standardvärden via `Object.assign(fresh(), …)`-mönstret.
- Både ljust och mörkt läge ska fungera (`prefers-color-scheme` och `data-theme`).
- Mobil först: touch-styrning med relativ dragning, safe-area-insets, inga hover-beroenden.

## Struktur i game.js (sektioner markerade med `// ---------- … ----------`)

| Sektion | Innehåll |
|---|---|
| sparad progress | `save` (omgång), `meta` (permanent), statistik `st()`, bestiarium `seeKey()` |
| (konstanter) | `UPS` uppgraderingar, `ETYPES` fiendetyper, `TYPES` vapen, `PERKS` förmågor, `BOSSES`, `levelCfg(L)` |
| perspektiv | Spelplanen är ett plan `PW×PL` som projiceras med `proj(x, y)`. All logik i plan-koordinater, bara ritning i skärmkoordinater. Truppen står på `SQY`. |
| speltillstånd | `THEMES` (ett per kapitel, styr himmel/mark/rekvisita/fiendeutseende), spawn, portar, `lose()` |
| uppdatering | `update(dt)` och `updateBoss()` |
| ritning | värld, rekvisita, portar, fiender (`drawEnemy` med skins), bossar, trupp, effekter |
| skärmar | nivå klar/död, statistiktabell, förmågor, förråd, meny |
| bestiarium | namn/texter per skin×typ, porträtt ritas med samma `drawEnemy` på små canvas |
| ljud | Web Audio, inga filer. `SFX.*` för händelser, `MUSIC` = ett generativt 8-taktsmönster per kapiteltema, trummor bara under spel |
| föräldraläge | kod, speltid (`left` i sekunder, räknas bara i `play`), aktivitet. Tiden slut → `state = 'locked'`, rätt kod fyller på och går till paus |
| styrning / loop | pekare + tangenter, `requestAnimationFrame`-loop |

`state` är en av: `menu`, `play`, `paused`, `done`, `fail`, `shop`, `perk`, `bestiary`, `parent`, `locked`.

## Spelregler och balans (ändra medvetet)

- **Kapitel:** 5 nivåer per kapitel, bossen på nivå 5/10/15/20 bestämmer temat för kapitlet. Cykeln upprepas från nivå 21 (bossar får `extra`-förmågor per varv).
- **Fiender:** liv `13 · 1.31^(L−1)`, typer låses upp på nivå 3/6/8/11, murar från nivå 4. Kontakt kostar `hp / (3·skada·3)` soldater (max 30 % av maxstorlek), missad fiende hälften (max 15 %).
- **Bossar:** liv `nivåns hp · 180`, 45 s innan de anfaller och utplånar truppen, rasande under 50 % liv.
- **Ekonomi:** kill-belöning `hp · 0.08`, uppgraderingar utan tak med kostnad ×1.34–1.45 per steg. Kurvan är kalibrerad så att svårigheten ökar ~31 %/nivå och spelarens styrka något långsammare – det skapar en vägg som förmågorna flyttar några nivåer.
- **Portar:** växer när man skjuter på dem i takt med vapnets skada/s (`share`), inte uppgraderingar.
- **Liv:** 3 per omgång (+ förmågan Sjunde livet), påfylls vid boss, 12,5 % chans per nivå att ett hjärta dyker upp på vägen.
- **Förmågor:** max 3, kan bara ersättas. Styrka efter dödsnivå `q = (L−1)/29`.

## Testa

Ingen testsvit. Kontrollera åtminstone:
1. `node --check game.js`
2. Öppna `index.html` och spela en nivå, gärna även i mörkt läge och smalt fönster (~390 px).

För snabb balanstest går det att sätta `localStorage` (`truppen-v3`) med valfri `level`/`up` i webbläsarens konsol och ladda om.

## Driftsättning

GitHub Pages publicerar grenen `main` från roten (`.nojekyll` gör att filerna serveras som de är). Push till `main` = live efter någon minut på https://dlundin-private.github.io/troops/. Testa större ändringar på en egen gren först.
