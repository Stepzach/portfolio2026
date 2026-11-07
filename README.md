# Zachary Stephens · Portfolio

Static portfolio for https://stephenszachary.com, served from the repository root by GitHub Pages. No build or dependency installation is required. The existing `CNAME` retains the custom domain.

## Preview and check

```sh
python3 -m http.server 4187
node --check franglish/app.js
node --check franglish/maps.js
node --check franglish/social.js
```

Open http://localhost:4187. The main portfolio is `index.html` with `portfolio.css`. Experience entries are in the `#experience` section. All typography uses the locally hosted Newsreader variable font and black text.

## Franglish Guide

The full guide is served at `/franglish/`, with its own relative assets and JavaScript. `/paris.html` redirects to it, preserving query parameters and fragments. `/projects.html` leads to the main portfolio's projects section. The guide has a same-tab link back to the portfolio.

This is a vendored snapshot of https://github.com/Stepzach/franglishguide at commit `a96c91716934073067f52572f9118001eb5171b3`. Future edits in that repository do not automatically sync here. To refresh, copy the guide's runtime HTML, CSS, JavaScript and `assets/` into `franglish/`, retaining the canonical URL and portfolio navigation additions in `index.html` and `style.css`.

The guide keeps the existing Firebase web configuration for `londonrestaurants-b7223`, so existing shared comments and likes use the same database. No Firebase rules, authentication settings or backend data were changed. Anonymous authentication and the existing Firestore rules must remain enabled. Likes and comments are not exercised by publishing this static site.

`2.html` and `3.html` are older portfolio layouts, retained with Newsreader typography. The independent art gallery experiments are unchanged.

## Credits

Newsreader is licensed under the SIL Open Font License; see `assets/newsreader-OFL.txt`. Guide photo and map credits and licenses remain in `franglish/assets/`; original photo sources are in `franglish/places.js`.

Air Liquide and Hummingbird company logos were supplied by Zach via LinkedIn and stored locally. The OpenAI mark is from Simple Icons v11.15.0 (CC0). Logos remain the property of their respective owners. Company logos retain their original colours. The Franglish project image is a 1440 × 900 capture of the guide homepage.
