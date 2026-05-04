# done-webflow-code

CDN-hostowany kod custom dla strony **D ONE** ([done-new-v1.webflow.io](https://done-new-v1.webflow.io)).

Repo trzyma JS i CSS, które są ładowane z jsDelivr bezpośrednio do Webflow przez `<script src>` / `<link href>`. Dzięki temu zmiana kodu nie wymaga republishowania Webflow — wystarczy `git push` + reload strony.

## Architektura

Webflow Site Settings i Page Settings zawierają **tylko tagi referencyjne** do plików w tym repo. Cała logika siedzi tutaj.

```
done-webflow-code/
├── lumos.css                     ← Lumos design system (linkowany w Site Head)
├── site-head.css                 ← style site-wide (linkowany w Site Head)
├── site-footer.js                ← orchestrator + custom transition + site-wide inity
├── pages/
│   ├── home/      head.css + footer.js
│   ├── d-group/   head.css + footer.js
│   ├── profile/   head.css + footer.js
│   └── projects/  head.css + footer.js
├── snapshot.sh                   ← rolling backup przed edycją (3 ostatnie kopie)
├── .backups/                     ← gitignored — lokalne snapshoty
└── README.md
```

## URLe jsDelivr

Wszystkie URLe używają branch'a `@main` — purge automatyczny po pushu (nie wymaga zmiany URL w Webflow).

| Sekcja Webflow | URL CDN |
|---|---|
| Site Head — Lumos CSS | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/lumos.css` |
| Site Head — site styles | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/site-head.css` |
| Site Footer — orchestrator + transition + site-wide | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/site-footer.js` |
| Home Page Head | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/home/head.css` |
| Home Page Footer | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/home/footer.js` |
| D Group Page Head | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/d-group/head.css` |
| D Group Page Footer | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/d-group/footer.js` |
| Profile Page Head | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/profile/head.css` |
| Profile Page Footer | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/profile/footer.js` |
| Projects Page Head | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/projects/head.css` |
| Projects Page Footer | `https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/projects/footer.js` |

## Workflow zmiany

1. **Edycja lokalna** — Claude/user edytuje plik w `done-webflow-code/`.
2. **Snapshot** — `./snapshot.sh <plik>` kopiuje aktualny plik do `.backups/<plik>/<timestamp>.bak` i obcina katalog do 3 najnowszych kopii.
3. **Commit** — `git add <plik> && git commit -m "<opis>"`.
4. **Push** — `git push`.
5. **Purge CDN** (opcjonalnie, dla natychmiastowej propagacji):
   ```bash
   curl https://purge.jsdelivr.net/gh/solowsolow/done-webflow-code@main/<plik>
   ```
   Bez purge: jsDelivr cache TTL ~10 min.
6. **Reload strony** — bez republishowania Webflow.

## Cache

- **jsDelivr `@main`**: agresywny cache (~10 min). Purge przez `https://purge.jsdelivr.net/...` resetuje natychmiast.
- **Browser cache**: `Cache-Control: max-age=604800, immutable` z jsDelivr — twardy reload (Cmd+Shift+R) lub DevTools "Disable cache" wymusza refresh w trakcie debugowania.

## Backup (`.backups/`)

Przed każdą edycją Claude wywołuje `./snapshot.sh <plik>`. Mechanizm:
- katalog `.backups/<sciezka_pliku>/` (slash w ścieżce zamieniany na `_`)
- pliki `<YYYYMMDD-HHMMSS>.bak` posortowane chronologicznie
- po snapshot trim do **3 najnowszych** — starsze są kasowane

Przywrócenie:
```bash
cp .backups/site-footer.js/20260429-160812.bak site-footer.js
```

## Co zostaje inline w Webflow (NIE w tym repo)

W **Site Head** w Webflow musi być zachowane jako inline (pre-paint critical):

```html
<!-- 1. Pre-paint baton check + Safari detection (musi być inline, sync) -->
<script>
  try {
    if (sessionStorage.getItem('__doneInTransition') === '1') {
      document.documentElement.setAttribute('data-done-boot-transition', '1');
    }
  } catch (e) {}
  try {
    var ua = navigator.userAgent;
    var isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Edg\/|OPR\//.test(ua);
    if (isSafari) document.documentElement.setAttribute('data-browser-safari', '1');
  } catch (e) {}
</script>

<!-- 2. Fix IX3 baseline transform (musi być inline — link CSS może mieć latency) -->
<style>
  html.w-mod-ix3 {
    transform: none !important; translate: none !important;
    rotate: none !important; scale: none !important;
  }
  [remove-flicker] { opacity: 0; }
</style>

<!-- 3. CDN style + JS (kolejność: critical inline → CSS → external libs → nasz CSS) -->
<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.21/dist/lenis.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/lumos.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/site-head.css">
```

W **Site Footer** w Webflow:

```html
<!-- Lenis + Lumos theme-collector + nasz orchestrator (kolejność krytyczna) -->
<script src="https://unpkg.com/lenis@1.3.21/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.1.1/theme-collector.js"></script>
<script src="https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/site-footer.js"></script>
```

W **per-page Head/Footer** (np. Home):

```html
<!-- Page Head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/home/head.css">

<!-- Page Footer -->
<script src="https://cdn.jsdelivr.net/gh/solowsolow/done-webflow-code@main/pages/home/footer.js"></script>
```

Analogicznie dla `/d-group`, `/profile`, `/projects` — podmieniając ścieżkę.

## Zależności (zewnętrzne CDN, ładowane w Webflow przed naszym kodem)

- **GSAP 3.14** + ScrollTrigger + Flip + Observer + CustomEase + SplitText (Webflow built-in lub Webflow Site Settings → Custom Code)
- **Lenis 1.3.21** (`https://unpkg.com/lenis@1.3.21/...`)
- **Lumos theme-collector** (`https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.1.1/theme-collector.js`)

## Linki

- Webflow site: `done-new-v1.webflow.io` (id `69a5bb12b4f6f3f67791b05e`)
- Domena docelowa: `d-one.com` (kwiecień 2026)
- Owner: SOLOW (solowsolow@gmail.com)
