/* =========================================================
   Alexandre Premium — interactions & animations
   Lenis (défilement fluide) + GSAP / ScrollTrigger
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;

  /* Endpoint du formulaire (Formspree, Getform, script PHP…). Vide = repli SMS. */
  const FORM_ENDPOINT = '';
  const PHONE = '+33611143404';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]static\b/.test(location.search);
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduced;

  /* ---------------------------------------------------------
     Utilitaires
     --------------------------------------------------------- */
  function splitWords(el, cls) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const s = document.createElement('span');
            s.className = cls;
            s.textContent = part;
            s.style.setProperty('--i', i++);
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.classList.add('is-split');
    return $$('.' + cls, el);
  }

  function splitChars(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    const n = text.length;
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.style.backgroundPosition = `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`;
      el.append(s);
    });
    el.classList.add('is-chars');
    return $$('.ch', el);
  }

  /* ---------------------------------------------------------
     Poussière d'or : traînée d'étincelles derrière le curseur
     --------------------------------------------------------- */
  function goldDust(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COLORS = ['255,248,225', '244,227,178', '236,213,156', '233,208,143', '201,164,92', '167,127,58'];
    const MAX = 420;
    let dpr = 1, w = 0, h = 0, raf = 0, last = null, parts = [];
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize, { passive: true });
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = (x, y, vx, vy, burst) => {
      if (parts.length >= MAX) parts.shift();
      const star = Math.random() < (burst ? 0.4 : 0.2);
      const a = Math.random() * Math.PI * 2, sp = burst ? rnd(1, 4.2) : rnd(0.1, 0.9);
      parts.push({
        x: x + rnd(-3, 3), y: y + rnd(-3, 3),
        vx: Math.cos(a) * sp + vx * 0.08, vy: Math.sin(a) * sp + vy * 0.08 - (burst ? 0.6 : 0),
        r: star ? rnd(2, 4) : rnd(0.6, 2.1),
        life: 0, ttl: rnd(burst ? 50 : 34, burst ? 95 : 80),
        c: COLORS[(Math.random() * COLORS.length) | 0],
        star, rot: rnd(0, Math.PI), tw: rnd(0.15, 0.35)
      });
    };
    const drawStar = (p, alpha) => {
      const s = p.r * (0.7 + 0.5 * Math.sin(p.life * p.tw));
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(${p.c},${alpha})`;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s * 3.2);
        ctx.quadraticCurveTo(-s * 0.18, s * 0.18, 0, 0);
      }
      ctx.fill();
      ctx.restore();
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        if (p.life >= p.ttl) { parts.splice(i, 1); continue; }
        p.vx *= 0.955; p.vy = p.vy * 0.955 + 0.035; // la poudre retombe doucement
        p.x += p.vx; p.y += p.vy; p.rot += 0.02;
        const k = p.life / p.ttl;
        const alpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.95;
        if (p.star) { drawStar(p, alpha); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${p.c},${alpha})`);
        g.addColorStop(0.35, `rgba(${p.c},${alpha * 0.45})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('mousemove', e => {
      const x = e.clientX, y = e.clientY;
      if (last) {
        const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
        const n = Math.min(Math.floor(d / 4), 10);
        for (let i = 0; i < n; i++) { const t = Math.random(); spawn(last.x + dx * t, last.y + dy * t, dx, dy); }
        if (n === 0 && Math.random() < 0.4) spawn(x, y, 0, 0);
      }
      last = { x, y };
      wake();
    }, { passive: true });
    addEventListener('mousedown', e => {
      for (let i = 0; i < 28; i++) spawn(e.clientX, e.clientY, 0, 0, true);
      wake();
    });
    document.addEventListener('mouseleave', () => { last = null; });
  }

  /* ---------------------------------------------------------
     Défilement fluide
     --------------------------------------------------------- */
  let lenis = null;
  if (animate && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const stopScroll = () => { lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'); };
  const startScroll = () => { lenis ? lenis.start() : (document.body.style.overflow = ''); };
  const scrollToTarget = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: -80, ...opts });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------------------------------------------------------
     Header : masqué en descendant, visible en remontant
     --------------------------------------------------------- */
  const header = $('[data-header]');
  let lastY = 0;
  const onScrollHeader = y => {
    header.classList.toggle('is-scrolled', y > 40);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > 160 && y > lastY);
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', e => onScrollHeader(e.scroll));
  else addEventListener('scroll', () => onScrollHeader(scrollY), { passive: true });
  onScrollHeader(scrollY);

  /* ---------------------------------------------------------
     Menu plein écran
     --------------------------------------------------------- */
  const burger = $('.burger');
  const menu = $('#menu');
  const menuLinks = $$('.menu__list a span, .menu__list small', menu);
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', open);
    open ? stopScroll() : startScroll();
    if (hasGsap) {
      gsap.killTweensOf([menu, menuLinks]);
      if (open) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0 : 0.9, ease: 'expo.inOut' });
        gsap.fromTo(menuLinks, { yPercent: 110 }, { yPercent: 0, duration: reduced ? 0 : 1, ease: 'expo.out', stagger: 0.04, delay: reduced ? 0 : 0.35 });
        gsap.fromTo('.menu__aside', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: reduced ? 0 : 0.6 });
      } else {
        gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: reduced ? 0 : 0.8, ease: 'expo.inOut', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) });
      }
    } else {
      menu.style.visibility = open ? 'visible' : 'hidden';
      menu.style.clipPath = open ? 'none' : '';
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------------------------------------------------------
     Transitions de page (rideau)
     --------------------------------------------------------- */
  const curtain = $('.curtain');
  function curtainOut() {
    if (!hasGsap || reduced) { curtain.style.visibility = 'hidden'; return Promise.resolve(); }
    return new Promise(res => {
      gsap.timeline({ onComplete: () => { gsap.set(curtain, { visibility: 'hidden' }); res(); } })
        .to('.curtain img', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.15)
        .to(curtain, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 0.25);
    });
  }
  function curtainIn(href) {
    if (!hasGsap || reduced) { location.href = href; return; }
    gsap.set(curtain, { visibility: 'visible' });
    gsap.timeline({ onComplete: () => { location.href = href; } })
      .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' })
      .fromTo('.curtain img', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4 }, 0.45);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (a.hasAttribute('data-top') || href === '#top') { e.preventDefault(); scrollToTarget(0, { offset: 0 }); return; }
    if (href.startsWith('#')) {
      const t = $(href);
      if (t) { e.preventDefault(); scrollToTarget(t); }
      return;
    }
    if (a.target === '_blank' || /^(mailto|tel|sms|https?):/.test(href)) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) {
      e.preventDefault();
      if (menuOpen) setMenu(false);
      const t = $(url.hash);
      if (t) setTimeout(() => scrollToTarget(t), menuOpen ? 600 : 0);
      return;
    }
    e.preventDefault();
    if (menuOpen) { setMenu(false); setTimeout(() => curtainIn(url.href), 500); }
    else curtainIn(url.href);
  });
  addEventListener('pageshow', e => {
    if (e.persisted) { if (hasGsap) gsap.set(curtain, { visibility: 'hidden', yPercent: -100 }); else curtain.style.visibility = 'hidden'; }
  });

  /* ---------------------------------------------------------
     Curseur personnalisé + boutons magnétiques
     --------------------------------------------------------- */
  const cursor = $('.cursor');
  if (finePointer && hasGsap && !reduced) {
    document.body.classList.add('has-cursor');
    const label = $('.cursor__label', cursor);
    const qx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
    const qy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('mousemove', e => { qx(e.clientX); qy(e.clientY); }, { passive: true });
    document.addEventListener('mouseover', e => {
      const media = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, [role="tab"], input, textarea, select');
      cursor.classList.toggle('is-media', !!media);
      cursor.classList.toggle('is-link', !media && !!link);
      label.textContent = media ? media.dataset.cursor : '';
    });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
    addEventListener('mousedown', () => cursor.classList.add('is-down'));
    addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    goldDust($('.sparkle-canvas'));

    $$('.magnetic').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------------------------------------------------------
     Préparation des textes
     --------------------------------------------------------- */
  const heroSplits = $$('[data-split]').map(el => splitWords(el, 'w'));
  const scrollSplits = $$('[data-split-scroll]').map(el => ({ el, words: splitWords(el, 'w') }));
  const reveals = $$('[data-reveal]').map(el => ({ el, words: splitWords(el, 'rw') }));
  const giant = $('[data-chars]');
  const giantChars = giant ? splitChars(giant) : [];

  /* ---------------------------------------------------------
     Pied de page « dévoilé » : fixe en arrière-plan, le contenu glisse au-dessus
     --------------------------------------------------------- */
  const footer = $('[data-footer]');
  const footerInner = $('[data-footer-inner]');
  const layer = $('.cta-band') || $('main');
  const signature = $('[data-signature]');
  let revealOn = false;
  function measureFooter() {
    if (!footer) return;
    const h = footer.offsetHeight;
    // seulement si le pied de page tient dans l'écran (sinon défilement classique)
    revealOn = h <= innerHeight - 20;
    root.classList.toggle('footer-reveal', revealOn);
    root.style.setProperty('--footer-h', h + 'px');
  }
  function onFooterScroll() {
    if (!footer || !layer) return;
    const fr = footer.getBoundingClientRect();
    const covered = Math.max(0, Math.min(fr.height, layer.getBoundingClientRect().bottom - fr.top)); // px encore masqués
    const k = fr.height ? 1 - covered / fr.height : 1; // 0 = caché, 1 = entièrement dévoilé
    if (revealOn && footerInner && !reduced) {
      footerInner.style.transform = `translate3d(0, ${(-(1 - k) * 22).toFixed(2)}%, 0)`;
      footerInner.style.opacity = (0.25 + 0.75 * k).toFixed(3);
    }
    if (signature && !signature.classList.contains('is-lit')) {
      const sr = signature.getBoundingClientRect();
      const visibleTop = Math.max(sr.top, layer.getBoundingClientRect().bottom);
      if (sr.bottom - visibleTop > sr.height * 0.55 && sr.top < innerHeight) signature.classList.add('is-lit');
    }
  }
  if (footer) {
    measureFooter();
    addEventListener('resize', () => { measureFooter(); onFooterScroll(); }, { passive: true });
    addEventListener('load', () => { measureFooter(); onFooterScroll(); });
    addEventListener('scroll', onFooterScroll, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(measureFooter).observe(footer);
    onFooterScroll();
  }

  /* ---------------------------------------------------------
     Animations
     --------------------------------------------------------- */
  function intro() {
    // titres « hero » : mots qui sortent du flou
    heroSplits.forEach(words => {
      gsap.fromTo(words,
        { opacity: 0, yPercent: 40, filter: 'blur(14px)' },
        { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out', stagger: 0.08, delay: 0.05 });
    });
    const bg = $('[data-hero-bg]');
    if (bg) gsap.fromTo(bg, { scale: 1.2 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
  }

  function setupScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // Hero accueil : parallaxe + fondu du contenu
    const bg = $('[data-hero-bg] img');
    if (bg) {
      gsap.to(bg, { yPercent: 22, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('[data-hero-content]', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
    }

    // Textes révélés mot à mot au scroll (flou → net)
    reveals.forEach(({ el, words }) => {
      gsap.fromTo(words,
        { opacity: 0.12, filter: 'blur(6px)' },
        { opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: 0.6 } });
    });

    // Titres secondaires : apparition au passage
    scrollSplits.forEach(({ el, words }) => {
      gsap.fromTo(words,
        { opacity: 0, yPercent: 40, filter: 'blur(12px)' },
        { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // Fondu vers le haut
    ScrollTrigger.batch('[data-fade]', {
      start: 'top 90%', once: true,
      onEnter: els => gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, overwrite: true })
    });
    gsap.set('[data-fade]', { opacity: 0 });

    // Images : rideau + zoom arrière
    $$('[data-clip]').forEach(box => {
      const img = $('img', box);
      const tl = gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 88%', once: true } });
      tl.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    });

    // Parallaxe
    $$('[data-parallax]').forEach(img => {
      const amt = parseFloat(img.dataset.parallax) || 10;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Vidéo : cadre qui s'agrandit + mots qui glissent
    $$('.scaler').forEach(sec => {
      const media = $('[data-scaler-media]', sec);
      const a = $('.scaler__word--a', sec);
      const b = $('.scaler__word--b', sec);
      const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true } });
      tl.to(media, { width: () => innerWidth, height: () => innerHeight, ease: 'power1.inOut', duration: 1 }, 0)
        .fromTo(a, { xPercent: -70, scale: 0.45, opacity: 0.25 }, { xPercent: 0, scale: 1, opacity: 1, ease: 'power2.out', duration: 0.8 }, 0)
        .fromTo(b, { xPercent: 70, scale: 0.45, opacity: 0.25 }, { xPercent: 0, scale: 1, opacity: 1, ease: 'power2.out', duration: 0.8 }, 0)
        .to({}, { duration: 0.25 });
    });

    // Services : cartes empilées
    const cards = $$('.stack__card');
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      gsap.to(card, {
        scale: 0.9, filter: 'brightness(0.45)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true }
      });
    });

    // Compteurs
    $$('[data-count]').forEach(el => {
      const obj = { v: 0 };
      gsap.to(obj, { v: +el.dataset.count, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.v); } });
    });

    // Marquee : accélère avec la vitesse de scroll
    const tracks = $$('.marquee__track, .quotes-marquee__track');
    if (lenis && tracks.length) {
      lenis.on('scroll', e => {
        const r = 1 + Math.min(Math.abs(e.velocity) / 12, 3);
        tracks.forEach(t => t.getAnimations().forEach(an => (an.playbackRate = r)));
      });
    }

    // Photo du bandeau CTA : parallaxe
    const ctaImg = $('[data-cta-img]');
    if (ctaImg) gsap.fromTo(ctaImg, { yPercent: -8 }, { yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.cta-band', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Grand « Premium » du pied de page
    if (giantChars.length) {
      gsap.fromTo(giantChars, { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: giant, start: 'top 95%', once: true } });
    }

    // Recalcul quand les images chargent
    let t;
    $$('img').forEach(img => { if (!img.complete) img.addEventListener('load', () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 200); }, { once: true }); });
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  if (animate) {
    setupScroll();
    curtainOut().then(() => { onReady(); });
    setTimeout(intro, 450);
  } else {
    if (hasGsap) gsap.set(curtain, { visibility: 'hidden' }); else curtain.style.visibility = 'hidden';
    onReady();
  }

  /* ---------------------------------------------------------
     Vidéo YouTube (fenêtre)
     --------------------------------------------------------- */
  $$('[data-video]').forEach(btn => btn.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Vidéo Alexandre Premium');
    modal.innerHTML = `<div class="video-modal__frame"><iframe src="https://www.youtube-nocookie.com/embed/${btn.dataset.video}?autoplay=1&rel=0&modestbranding=1" title="Alexandre Premium — vidéo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><button aria-label="Fermer la vidéo">×</button>`;
    document.body.append(modal);
    stopScroll();
    if (hasGsap) gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    const close = () => { modal.remove(); startScroll(); btn.focus(); removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    $('button', modal).addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    addEventListener('keydown', esc);
    $('button', modal).focus();
  }));

  /* ---------------------------------------------------------
     Galerie + visionneuse
     --------------------------------------------------------- */
  const gal = $$('[data-gallery] figure img');
  if (gal.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Galerie photo');
    lb.innerHTML = '<img alt=""><button class="lb-close" aria-label="Fermer">×</button><button class="lb-prev" aria-label="Photo précédente">←</button><button class="lb-next" aria-label="Photo suivante">→</button><span class="lb-count"></span>';
    lb.querySelector('.lb-count').setAttribute('aria-live', 'polite');
    document.body.append(lb);
    const img = $('img', lb), count = $('.lb-count', lb);
    let idx = 0, last;
    const show = i => {
      idx = (i + gal.length) % gal.length;
      img.src = gal[idx].src; img.alt = gal[idx].alt;
      count.textContent = `${idx + 1} / ${gal.length}`;
      if (hasGsap && !reduced) gsap.fromTo(img, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
    };
    const open = i => { last = document.activeElement; show(i); lb.classList.add('is-open'); stopScroll(); $('.lb-close', lb).focus(); };
    const close = () => { lb.classList.remove('is-open'); startScroll(); last && last.focus(); };
    gal.forEach((g, i) => {
      const fig = g.parentElement;
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Agrandir : ' + g.alt);
      fig.addEventListener('click', () => open(i));
      fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    $('.lb-close', lb).onclick = close;
    $('.lb-prev', lb).onclick = () => show(idx - 1);
    $('.lb-next', lb).onclick = () => show(idx + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    let sx = 0;
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---------------------------------------------------------
     Équipe : présentations
     --------------------------------------------------------- */
  const bio = $('#bio');
  function openBio(btn) {
    const name = $('.member__name', btn).textContent;
    $('#bioImg').src = $('img', btn).src;
    $('#bioImg').alt = name;
    $('#bioName').textContent = name;
    $('#bioRole').textContent = $('.member__role', btn).textContent;
    $('#bioText').replaceChildren($('#bio-' + btn.dataset.member).content.cloneNode(true));
    bio.showModal();
    stopScroll();
  }
  if (bio) {
    $$('.member').forEach(btn => {
      const name = $('.member__name', btn).textContent;
      btn.setAttribute('aria-label', `${name} — ${$('.member__role', btn).textContent}. Lire la présentation`);
      $('img', btn).alt = name;
      btn.addEventListener('click', () => openBio(btn));
    });
    bio.addEventListener('close', startScroll);
    $('[data-bio-close]', bio).addEventListener('click', () => bio.close());
    bio.addEventListener('click', e => { if (e.target === bio) bio.close(); });
  }

  /* ---------------------------------------------------------
     Tarifs : onglets
     --------------------------------------------------------- */
  const tabs = $$('[role="tab"]');
  const tabImg = $('[data-tab-img]');
  function selectTab(t) {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      const panel = $('#' + x.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) {
        if (hasGsap && !reduced) gsap.fromTo($$('.prices li', panel), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.035 });
        if (tabImg && panel.dataset.img && !tabImg.src.endsWith(panel.dataset.img)) {
          if (hasGsap && !reduced) {
            gsap.to(tabImg, { opacity: 0, duration: 0.25, onComplete: () => { tabImg.src = panel.dataset.img; gsap.fromTo(tabImg, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' }); } });
          } else tabImg.src = panel.dataset.img;
        }
      }
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); }
    });
  });

  /* ---------------------------------------------------------
     Partenaires : copier le code promo
     --------------------------------------------------------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Code copié ✓'; }
    catch { b.textContent = b.dataset.copy; }
    setTimeout(() => (b.textContent = 'Copier le code'), 2500);
  }));

  /* ---------------------------------------------------------
     Contact
     --------------------------------------------------------- */
  const form = $('#contactForm');
  if (form) {
    const status = $('#formStatus');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach(f => {
        const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle('is-invalid', bad);
        f.setAttribute('aria-invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) { status.textContent = 'Merci de compléter les champs indiqués.'; return; }
      const data = Object.fromEntries(new FormData(form));
      if (FORM_ENDPOINT) {
        status.textContent = 'Envoi en cours…';
        try {
          const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!r.ok) throw new Error(r.status);
          form.reset();
          status.textContent = 'Merci ! Votre message a bien été envoyé, nous revenons vers vous très vite.';
        } catch {
          status.textContent = "L'envoi a échoué. Appelez-nous au 06 11 14 34 04.";
        }
        return;
      }
      const body = `Bonjour, je suis ${data.prenom} ${data.nom} (${data.email}${data.tel ? ', ' + data.tel : ''}). Prestation : ${data.prestation}. ${data.message}`;
      location.href = `sms:${PHONE}?&body=${encodeURIComponent(body)}`;
      status.textContent = 'Votre application de messagerie va s’ouvrir. Vous pouvez aussi appeler le 06 11 14 34 04.';
    });
  }

  /* ---------------------------------------------------------
     Après l'arrivée sur la page
     --------------------------------------------------------- */
  function onReady() {
    // lien profond vers un membre de l'équipe (equipe.html#jorge)
    if (location.hash && bio) {
      const m = $(location.hash + '.member');
      if (m) {
        m.classList.add('is-target');
        scrollToTarget(m, { immediate: false });
        setTimeout(() => openBio(m), 900);
      }
    } else if (location.hash) {
      const t = $(location.hash);
      if (t) setTimeout(() => scrollToTarget(t), 100);
    }
  }

  $$('[data-year]').forEach(y => (y.textContent = new Date().getFullYear()));
})();
