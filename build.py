#!/usr/bin/env python3
"""Génère les pages HTML du site à partir de src/pages/*.html.

Chaque fichier de src/pages commence par un commentaire JSON :
<!--{"title": "...", "description": "...", "nav": "histoire", "bodyClass": "..."}-->
puis le contenu du <main>. L'en-tête, le menu et le pied de page sont communs.

Usage : python3 build.py
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
PAGES = ROOT / "src" / "pages"

NAV = [
    ("accueil", "index.html", "Accueil"),
    ("histoire", "histoire.html", "Notre histoire"),
    ("equipe", "equipe.html", "Notre équipe"),
    ("services", "services.html", "Nos services"),
    ("realisations", "realisations.html", "Réalisations"),
    ("tarifs", "tarifs.html", "Tarifs"),
    ("partenaires", "partenaires.html", "Partenaires"),
    ("contact", "contact.html", "Contact"),
]
# liens affichés dans la barre desktop (le menu plein écran les contient tous)
NAV_INLINE = {"accueil", "histoire", "equipe", "services", "realisations", "tarifs"}

SOCIALS = [
    ("Instagram", "IG", "https://www.instagram.com/alexandre.premium/"),
    ("Facebook", "FB", "https://www.facebook.com/Alexandre-Premium-106299601455337"),
    ("YouTube", "YT", "https://www.youtube.com/channel/UCLbWMzTFlFlf2b73EqHX_wQ"),
    ("LinkedIn", "IN", "https://www.linkedin.com/in/jorge-alexandre-b20b44204/"),
    ("X / Twitter", "X", "https://twitter.com/AlexandrePremi3"),
]

HEAD = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#0a0908">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="assets/brand/logo-gold.jpg">
  <meta property="og:type" content="website">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/brand/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/brand/favicon-64.png">
  <link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Host+Grotesk:wght@300;400;500&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script>document.documentElement.classList.add('js')</script>
{extra_head}</head>
<body class="{body_class}" data-page="{nav}">
<a class="skip" href="#contenu">Aller au contenu</a>

<div class="curtain" aria-hidden="true"><img src="assets/brand/logo-gold-128.png" alt="" width="64" height="64"></div>
<canvas class="sparkle-canvas" aria-hidden="true"></canvas>
<div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
"""

def cur(key, active):
    return ' aria-current="page"' if key == active else ""

def header(active):
    inline = "\n".join(
        f'      <a href="{href}"{cur(key, active)}>{label}</a>'
        for key, href, label in NAV if key in NAV_INLINE
    )
    menu = "\n".join(
        f'      <li><a href="{href}"{cur(key, active)}><small>0{i}</small><span>{label}</span></a></li>'
        for i, (key, href, label) in enumerate(NAV, 1)
    )
    socials = "\n".join(
        f'        <li><a href="{url}" target="_blank" rel="noopener">{name}</a></li>' for name, _, url in SOCIALS
    )
    return f"""
<header class="header" data-header>
  <a href="index.html" class="brand" aria-label="Alexandre Premium — accueil">
    <img src="assets/brand/logo-gold-128.png" alt="" width="40" height="40">
    <span>Alexandre <em>Premium</em></span>
  </a>
  <nav class="nav" aria-label="Navigation principale">
{inline}
  </nav>
  <a href="contact.html" class="pill magnetic">Réserver</a>
  <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu">
    <span></span><span></span><span></span>
  </button>
</header>

<nav class="menu" id="menu" aria-label="Menu" data-lenis-prevent>
  <div class="menu__inner">
    <ol class="menu__list">
{menu}
    </ol>
    <div class="menu__aside">
      <p class="eyebrow">Jorge Alexandre</p>
      <a class="menu__phone" href="tel:+33611143404">06 11 14 34 04</a>
      <ul class="menu__socials">
{socials}
      </ul>
      <p class="menu__motto">« Je m'occupe de tout… et de Vous ! »</p>
    </div>
  </div>
</nav>
"""

def footer():
    socials = "\n".join(
        f'        <li><a href="{url}" target="_blank" rel="noopener">{name}</a></li>' for name, _, url in SOCIALS
    )
    menu = "\n".join(f'        <li><a href="{href}">{label}</a></li>' for _, href, label in NAV)
    return f"""
<section class="cta-band" aria-label="Prendre rendez-vous">
  <div class="cta-band__bg" aria-hidden="true"><img src="assets/gallery/stock-5.jpg" alt="" loading="lazy" data-cta-img></div>
  <div class="cta-band__veil" aria-hidden="true"></div>
  <div class="cta-band__inner">
    <p class="label" data-fade>Réservation</p>
    <p class="footer__big" data-reveal>Un moment rien que pour <em>vous&nbsp;?</em></p>
    <div class="cta-band__actions" data-fade>
      <a href="contact.html" class="btn btn--gold magnetic">Prendre rendez-vous <span aria-hidden="true">→</span></a>
      <a href="tel:+33611143404" class="link-arrow magnetic">06 11 14 34 04</a>
    </div>
  </div>
</section>

<footer class="footer" data-footer>
  <div class="footer__inner" data-footer-inner>
  <div class="footer__cols">
    <div>
      <p class="eyebrow">Contact</p>
      <p>Jorge Alexandre<br><a href="tel:+33611143404">06 11 14 34 04</a><br>À domicile &amp; en salons partenaires</p>
    </div>
    <div>
      <p class="eyebrow">Suivre</p>
      <ul>
{socials}
      </ul>
    </div>
    <div>
      <p class="eyebrow">Menu</p>
      <ul>
{menu}
      </ul>
    </div>
  </div>
  <div class="signature" data-signature>
    <p class="signature__text" aria-label="Alexandre Premium"><span class="signature__ink" aria-hidden="true">Alexandre Premium</span><span class="signature__glow" aria-hidden="true">Alexandre Premium</span></p>
    <svg class="signature__flourish" viewBox="0 0 600 40" fill="none" aria-hidden="true"><path d="M8 28 C 120 6, 260 40, 380 20 S 560 10, 592 18" stroke="url(#sigGold)" stroke-width="1.4" stroke-linecap="round"/><defs><linearGradient id="sigGold" x1="0" x2="1"><stop offset="0" stop-color="#9a7432" stop-opacity="0"/><stop offset=".3" stop-color="#e9d08f"/><stop offset=".7" stop-color="#f4e3b2"/><stop offset="1" stop-color="#a77f3a" stop-opacity="0"/></linearGradient></defs></svg>
  </div>
  <div class="footer__legal">
    <span>© <span data-year>2026</span> Alexandre Premium</span>
    <span>« Je m'occupe de tout… et de Vous ! »</span>
    <a href="#top" data-top>Haut de page ↑</a>
  </div>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="main.js" defer></script>
</body>
</html>
"""

def build():
    for src in sorted(PAGES.glob("*.html")):
        raw = src.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--(\{.*?\})-->\s*", raw, re.S)
        if not m:
            raise SystemExit(f"Métadonnées manquantes dans {src.name}")
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        out = HEAD.format(
            title=meta["title"],
            description=meta["description"],
            nav=meta.get("nav", ""),
            body_class=meta.get("bodyClass", ""),
            extra_head=meta.get("extraHead", ""),
        )
        out += header(meta.get("nav"))
        out += '\n<main id="contenu">\n' + body.strip() + "\n</main>\n"
        out += footer()
        # version dans l'URL : le navigateur recharge le CSS/JS dès qu'ils changent
        for asset in ("styles.css", "main.js"):
            ver = hashlib.md5((ROOT / asset).read_bytes()).hexdigest()[:8]
            out = out.replace(f'"{asset}"', f'"{asset}?v={ver}"')
        (ROOT / src.name).write_text(out, encoding="utf-8")
        print("✓", src.name)

if __name__ == "__main__":
    build()
