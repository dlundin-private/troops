# Truppen

Ett crowd-runner-spel i webbläsaren: styr en trupp, skjut fiender, välj rätt portar. Nivåer, uppgraderingar, bossar var femte nivå, liv och förmågor som följer med mellan omgångar. Inga annonser, inga köp.

## Spela lokalt

Öppna `public/index.html` direkt i en webbläsare, eller kör en enkel server:

```
npx serve public
```

## Driftsättning

Projektet är en statisk Cloudflare Worker (`wrangler.jsonc` pekar på `public/`).

- **Automatiskt:** koppla repot i Cloudflare under Workers & Pages → din Worker → Settings → Builds → Connect. Varje push till `main` driftsätts.
- **Manuellt:** `npx wrangler deploy`
