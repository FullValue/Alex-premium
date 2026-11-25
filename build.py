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

WHATSAPP = "https://wa.me/33611143404"

# icônes 24x24 (trait ou plein, couleur = currentColor)
ICONS = {
    "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
    "facebook": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 21.5v-8h2.7l.4-3.2h-3.1V8.3c0-.9.3-1.5 1.6-1.5h1.6V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.3H7.8v3.2h2.6v8z"/></svg>',
    "youtube": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8zM10 15.1V8.9l5.2 3.1z"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3.2 9h3.6v11.5H3.2zM9.1 9h3.4v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.6v6.2h-3.6V15c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.6H9.1z"/></svg>',
    "x": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
    "whatsapp": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.3 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.2 3.7 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.4-.2z"/></svg>',
    "arrow-up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
}

SOCIALS = [
    ("Instagram", "IG", "https://www.instagram.com/alexandre.premium/"),
    ("Facebook", "FB", "https://www.facebook.com/Alexandre-Premium-106299601455337"),
    ("YouTube", "YT", "https://www.youtube.com/channel/UCLbWMzTFlFlf2b73EqHX_wQ"),
    ("LinkedIn", "IN", "https://www.linkedin.com/in/jorge-alexandre-b20b44204/"),
    ("X / Twitter", "X", "https://twitter.com/AlexandrePremi3"),
    ("WhatsApp", "WA", WHATSAPP),
]
ICON_OF = {"IG": "instagram", "FB": "facebook", "YT": "youtube", "IN": "linkedin", "X": "x", "WA": "whatsapp"}

def social_icons(cls="social-icons", indent="        "):
    items = "\n".join(
        f'{indent}  <li><a href="{url}" target="_blank" rel="noopener" aria-label="{name}" title="{name}">{ICONS[ICON_OF[code]]}</a></li>'
        for name, code, url in SOCIALS
    )
    return f'{indent}<ul class="{cls}" aria-label="Réseaux sociaux">\n{items}\n{indent}</ul>'


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
    socials = social_icons("social-icons menu__socials", "      ")
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
{socials}
      <p class="menu__motto">« Je m'occupe de tout… et de Vous ! »</p>
    </div>
  </div>
</nav>
"""

def footer():
    socials = social_icons("social-icons footer__socials", "      ")
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
{socials}
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
    <a href="#top" data-top class="to-top magnetic" aria-label="Revenir en haut de la page" title="Haut de page">{ICONS["arrow-up"]}</a>
  </div>
  </div>
</footer>

<a class="wa-float magnetic" href="{WHATSAPP}" target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp" data-cursor="WhatsApp">
  <span class="wa-float__shine" aria-hidden="true"></span>{ICONS["whatsapp"]}
</a>

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
        body = raw[m.end():].replace("<!-- @socials -->", social_icons("social-icons", "    "))
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
