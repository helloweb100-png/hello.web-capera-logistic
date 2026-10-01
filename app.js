/* ==========================================================================
   CAPERA LOGISTICS — app.js
   JavaScript vanilla (sin frameworks). Único recurso externo opcional: Lenis
   (scroll suave). Si no carga, el sitio usa el scroll nativo sin perder nada.
   --------------------------------------------------------------------------
   01. Utilidades            08. Hero (tilt · ETA · canvas de rutas)
   02. Preloader             09. Scroll vinculado (parallax · manifiesto ·
   03. Scroll suave                tarjetas apiladas · línea de proceso)
   04. Header · menú         10. Contadores
   05. Navegación activa     11. FAQ
   06. Revelados · texto     12. Formulario → WhatsApp
   07. Interacciones         13. Arranque
   ========================================================================== */
(() => {
    'use strict';

    /* ======================================================================
       01. UTILIDADES
       ====================================================================== */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isStackLayout = () => window.matchMedia('(min-width: 1024px) and (min-height: 640px)').matches;

    const WA_NUMBER = '523332449856';

    let lenis = null;
    let navH = 72;

    const readNavH = () => {
        const header = $('#header');
        navH = header ? header.offsetHeight : 72;
    };

    /* ======================================================================
       02. PRELOADER
       Progreso real (fuentes + recursos) combinado con una rampa mínima de
       tiempo para que la animación de marca se aprecie.
       ====================================================================== */
    function initPreloader() {
        const loader = $('#preloader');
        if (!loader) { onReady(); return; }

        root.classList.add('is-loading');

        const numEl = $('#pl-num');
        const fillEl = $('#pl-fill');
        const msgEl = $('#pl-msg');
        const messages = [
            [0, 'Preparando tu ruta'],
            [34, 'Asignando operadores'],
            [66, 'Optimizando entregas'],
            [94, 'Todo listo']
        ];

        const MIN_MS = reduceMotion ? 250 : 2300;
        const t0 = performance.now();
        let ready = false;
        let finished = false;
        let currentMsg = -1;

        const loadSignal = new Promise((resolve) => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve, { once: true });
        });
        const fontsSignal = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        const heroImg = $('.hv-frame img');
        const heroSignal = (heroImg && heroImg.decode) ? heroImg.decode().catch(() => {}) : Promise.resolve();

        Promise.all([loadSignal, fontsSignal, heroSignal]).then(() => { ready = true; });
        window.setTimeout(() => { ready = true; }, 6500); // red de seguridad

        const frame = (now) => {
            const t = clamp((now - t0) / MIN_MS, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const cap = ready ? 100 : 92;
            const value = Math.min(eased * 100, cap);

            numEl.textContent = Math.floor(value);
            fillEl.style.transform = `scaleX(${value / 100})`;

            const idx = messages.reduce((acc, m, i) => (value >= m[0] ? i : acc), 0);
            if (idx !== currentMsg) { currentMsg = idx; msgEl.textContent = messages[idx][1]; }

            if (value >= 100 && !finished) { finished = true; finish(); return; }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);

        function finish() {
            window.setTimeout(() => {
                loader.classList.add('is-done');
                root.classList.remove('is-loading');
                root.classList.add('is-ready');
                onReady();
                window.setTimeout(() => loader.remove(), 1400);
            }, 350);
        }
    }

    function onReady() {
        initSmoothScroll();
        window.setTimeout(() => {
            const wa = $('#wa-float');
            if (!wa) return;
            wa.classList.add('is-visible');
            if (finePointer) {
                window.setTimeout(() => {
                    wa.classList.add('show-tip');
                    window.setTimeout(() => wa.classList.remove('show-tip'), 5200);
                }, 5000);
            }
        }, 1800);
        measure();
    }

    /* ======================================================================
       03. SCROLL SUAVE (Lenis) + ANCLAS
       ====================================================================== */
    function initSmoothScroll() {
        if (reduceMotion || lenis || typeof window.Lenis !== 'function') return;
        try {
            lenis = new window.Lenis({
                lerp: 0.085,
                wheelMultiplier: 0.95,
                smoothWheel: true,
                autoRaf: true
            });
        } catch (e) {
            lenis = null;
        }
    }

    function scrollToTarget(hash) {
        const target = hash === '#' || hash === '#inicio' ? document.body : $(hash);
        if (!target) return;
        const top = hash === '#inicio' || hash === '#' ? 0 : target.getBoundingClientRect().top + window.scrollY;
        if (lenis) {
            lenis.start();
            lenis.scrollTo(top, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
    }

    function initAnchors() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            const hash = link.getAttribute('href');
            if (!hash || hash.length < 1) return;
            if (hash !== '#' && !$(hash)) return;
            e.preventDefault();
            const fromMenu = root.classList.contains('menu-open');
            if (fromMenu) closeMenu(false);
            window.requestAnimationFrame(() => {
                scrollToTarget(hash);
                if (history.pushState) history.pushState(null, '', hash === '#' ? location.pathname : hash);
            });
        });
    }

    /* ======================================================================
       04. HEADER · MENÚ MÓVIL
       ====================================================================== */
    const header = () => $('#header');
    let lastFocus = null;

    function openMenu() {
        const menu = $('#menu');
        const burger = $('#burger');
        if (!menu) return;
        lastFocus = document.activeElement;
        root.classList.add('menu-open');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        menu.setAttribute('aria-hidden', 'false');
        menu.removeAttribute('inert');
        if (lenis) lenis.stop();
        window.setTimeout(() => { const first = $('[data-menu-link]', menu); if (first) first.focus({ preventScroll: true }); }, 450);
    }

    function closeMenu(restoreFocus = true) {
        const menu = $('#menu');
        const burger = $('#burger');
        if (!menu || !root.classList.contains('menu-open')) return;
        root.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        menu.setAttribute('aria-hidden', 'true');
        menu.setAttribute('inert', '');
        if (lenis) lenis.start();
        if (restoreFocus && lastFocus) lastFocus.focus({ preventScroll: true });
    }

    function initMenu() {
        const burger = $('#burger');
        const menu = $('#menu');
        if (!burger || !menu) return;
        menu.setAttribute('inert', '');
        burger.addEventListener('click', () => (root.classList.contains('menu-open') ? closeMenu() : openMenu()));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        const desktop = window.matchMedia('(min-width: 1024px)');
        const onChange = (e) => { if (e.matches) closeMenu(false); };
        if (desktop.addEventListener) desktop.addEventListener('change', onChange);
        else if (desktop.addListener) desktop.addListener(onChange); // Safari < 14
    }

    /* ======================================================================
       05. NAVEGACIÓN ACTIVA
       ====================================================================== */
    function initActiveNav() {
        const links = $$('.nav-desktop a');
        const sections = $$('main > section[id]');
        if (!links.length || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = '#' + entry.target.id;
                links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
            });
        }, { rootMargin: '-42% 0px -52% 0px' });
        sections.forEach((s) => io.observe(s));
    }

    /* ======================================================================
       06. REVELADOS · TEXTO DIVIDIDO
       ====================================================================== */
    function splitWords(el, { mask = true } = {}) {
        el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
        let index = 0;
        const words = [];

        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const outer = document.createElement('span');
                        outer.setAttribute('aria-hidden', 'true');
                        if (mask) {
                            outer.className = 'w';
                            const inner = document.createElement('span');
                            inner.className = 'w-i';
                            inner.style.setProperty('--wi', Math.min(index, 14));
                            inner.textContent = part;
                            outer.appendChild(inner);
                        } else {
                            outer.className = 'mw';
                            outer.textContent = part;
                            words.push(outer);
                        }
                        index += 1;
                        frag.appendChild(outer);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        };
        walk(el);
        return words;
    }

    function initReveals() {
        $$('[data-split]').forEach((el) => splitWords(el, { mask: true }));

        const targets = $$('[data-reveal], [data-split]');
        if (!('IntersectionObserver' in window) || reduceMotion) {
            targets.forEach((el) => el.classList.add('is-in'));
            return;
        }
        // Los elementos con clip-path propio (mascara) se observan desde su contenedor:
        // un elemento totalmente recortado nunca reportaria interseccion.
        const watched = new Map();
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = watched.get(entry.target);
                if (el) el.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
        targets.forEach((el) => {
            const watch = el.dataset.reveal === 'mask' ? el.parentElement : el;
            watched.set(watch, el);
            io.observe(watch);
        });
    }

    /* ======================================================================
       07. INTERACCIONES (foco de luz · botones magnéticos)
       ====================================================================== */
    function initSpotlight() {
        if (!finePointer) return;
        $$('[data-spotlight]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            }, { passive: true });
        });
    }

    function initMagnetic() {
        if (!finePointer || reduceMotion) return;
        $$('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * 0.22;
                const y = (e.clientY - r.top - r.height / 2) * 0.32;
                el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            }, { passive: true });
            el.addEventListener('pointerleave', () => { el.style.translate = ''; });
        });
    }

    /* ======================================================================
       08. HERO
       ====================================================================== */
    function initHeroTilt() {
        if (!finePointer || reduceMotion) return;
        const wrap = $('.hero-visual');
        const stage = $('[data-tilt]');
        if (!wrap || !stage) return;
        wrap.addEventListener('pointermove', (e) => {
            const r = wrap.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            stage.style.transform = `rotateY(${(px * 9).toFixed(2)}deg) rotateX(${(-py * 7).toFixed(2)}deg)`;
        }, { passive: true });
        wrap.addEventListener('pointerleave', () => { stage.style.transform = ''; });
    }

    function initEta() {
        const etaEl = $('#eta');
        const svg = $('.gc-map');
        if (!etaEl || !svg || reduceMotion) return;
        const LOOP = 7; // misma duración que la animación del marcador
        window.setInterval(() => {
            let t = 0;
            try { t = svg.getCurrentTime(); } catch (e) { t = performance.now() / 1000; }
            const phase = (t % LOOP) / LOOP;
            etaEl.textContent = String(Math.max(2, 12 - Math.floor(phase * 10)));
        }, 400);
    }

    /* Red de rutas animada: nodos que flotan y pulsos naranjas que recorren
       las conexiones, como paquetes viajando por la ciudad. */
    function initHeroCanvas() {
        const canvas = $('#hero-canvas');
        const hero = $('.hero');
        if (!canvas || !hero) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const NAVY = '10,25,49';
        const ORANGE = '255,122,0';

        let w = 0, h = 0, dpr = 1;
        let nodes = [], edges = [], adj = [], pulses = [];
        let running = false, rafId = 0, last = 0, inView = true;
        const mouse = { x: -9999, y: -9999 };

        function build() {
            const count = clamp(Math.round((w * h) / 24000), 16, 54);
            const cols = Math.max(3, Math.round(Math.sqrt(count * (w / h))));
            const rows = Math.max(3, Math.ceil(count / cols));
            const cw = w / cols, ch = h / rows;

            nodes = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    nodes.push({
                        bx: (c + 0.2 + Math.random() * 0.6) * cw,
                        by: (r + 0.2 + Math.random() * 0.6) * ch,
                        x: 0, y: 0,
                        ph: Math.random() * Math.PI * 2,
                        amp: 5 + Math.random() * 11,
                        sp: 0.00018 + Math.random() * 0.0003,
                        r: 1.3 + Math.random() * 1.3
                    });
                }
            }

            // Cada nodo se conecta con sus 2-3 vecinos más cercanos
            edges = [];
            adj = nodes.map(() => []);
            const seen = new Set();
            nodes.forEach((a, i) => {
                const near = nodes
                    .map((b, j) => ({ j, d: (a.bx - b.bx) ** 2 + (a.by - b.by) ** 2 }))
                    .filter((o) => o.j !== i)
                    .sort((p, q) => p.d - q.d)
                    .slice(0, 2 + (i % 2));
                near.forEach(({ j }) => {
                    const key = i < j ? i + '-' + j : j + '-' + i;
                    if (seen.has(key)) return;
                    seen.add(key);
                    edges.push([i, j]);
                    adj[i].push(j);
                    adj[j].push(i);
                });
            });

            // Pulsos que viajan por la red
            const total = clamp(Math.round(nodes.length / 3.2), 5, 14);
            pulses = [];
            for (let k = 0; k < total; k++) pulses.push(newPulse(Math.floor(Math.random() * nodes.length)));
        }

        function newPulse(from, prev = -1) {
            const options = adj[from].filter((n) => n !== prev);
            const pool = options.length ? options : adj[from];
            const to = pool.length ? pool[Math.floor(Math.random() * pool.length)] : from;
            return { from, to, prev: from, t: Math.random(), speed: 0.00035 + Math.random() * 0.00045 };
        }

        function resize() {
            const rect = hero.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
            draw(performance.now(), 0);
        }

        function draw(now, dt) {
            ctx.clearRect(0, 0, w, h);

            nodes.forEach((n) => {
                n.x = n.bx + Math.cos(now * n.sp + n.ph) * n.amp;
                n.y = n.by + Math.sin(now * n.sp * 1.3 + n.ph) * n.amp;
            });

            // Conexiones
            ctx.lineWidth = 1;
            edges.forEach(([i, j]) => {
                const a = nodes[i], b = nodes[j];
                const mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y;
                const near = clamp(1 - Math.hypot(mx, my) / 220, 0, 1);
                ctx.strokeStyle = `rgba(${NAVY},${0.07 + near * 0.16})`;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            });

            // Nodos
            nodes.forEach((n) => {
                const near = clamp(1 - Math.hypot(n.x - mouse.x, n.y - mouse.y) / 180, 0, 1);
                ctx.fillStyle = near > 0.05 ? `rgba(${ORANGE},${0.25 + near * 0.6})` : `rgba(${NAVY},0.2)`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + near * 1.8, 0, Math.PI * 2);
                ctx.fill();
            });

            // Pulsos
            pulses.forEach((p, idx) => {
                p.t += p.speed * dt;
                if (p.t >= 1) { pulses[idx] = newPulse(p.to, p.from); return; }
                const a = nodes[p.from], b = nodes[p.to];
                const x = lerp(a.x, b.x, p.t), y = lerp(a.y, b.y, p.t);
                const tail = Math.max(0, p.t - 0.22);
                const tx = lerp(a.x, b.x, tail), ty = lerp(a.y, b.y, tail);

                const g = ctx.createLinearGradient(tx, ty, x, y);
                g.addColorStop(0, `rgba(${ORANGE},0)`);
                g.addColorStop(1, `rgba(${ORANGE},0.85)`);
                ctx.strokeStyle = g;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(x, y);
                ctx.stroke();

                ctx.fillStyle = `rgba(${ORANGE},0.2)`;
                ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgb(${ORANGE})`;
                ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
            });
        }

        function loop(now) {
            if (!running) return;
            const dt = Math.min(now - last, 64);
            last = now;
            draw(now, dt);
            rafId = requestAnimationFrame(loop);
        }
        function start() { if (running || reduceMotion) return; running = true; last = performance.now(); rafId = requestAnimationFrame(loop); }
        function stop() { running = false; cancelAnimationFrame(rafId); }

        resize();
        let resizeTimer;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                mouse.x = e.clientX - r.left;
                mouse.y = e.clientY - r.top;
            }, { passive: true });
            hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; inView && !document.hidden ? start() : stop(); }).observe(hero);
        } else { start(); }
        document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (inView && start()); });
    }

    /* ======================================================================
       09. SCROLL VINCULADO
       Un único bucle rAF lee el scroll y actualiza todos los efectos.
       ====================================================================== */
    const fx = {
        y: -1, vh: window.innerHeight, docH: 1, dirty: true,
        parallax: [], dark: [], manifesto: null, manifestoWords: [], steps: null, stepItems: [], stack: [], hero: null
    };

    function measure() {
        readNavH();
        fx.vh = window.innerHeight;
        fx.docH = Math.max(1, document.documentElement.scrollHeight - fx.vh);
        const y = window.scrollY;
        const abs = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + y, h: r.height }; };

        fx.parallax = $$('[data-parallax]').map((el) => {
            const box = abs(el.parentElement);
            return { el, speed: parseFloat(el.dataset.parallax) || 0, center: box.top + box.h / 2 };
        });

        fx.dark = $$('.section--dark, .site-footer').map(abs);
        if (fx.manifesto) { const b = abs(fx.manifesto); fx.manifestoBox = b; }
        if (fx.steps) { fx.stepsBox = abs(fx.steps); }
        fx.dirty = true;
    }

    function updateFx() {
        const y = window.scrollY;
        const { vh } = fx;

        // Header + barra de progreso
        const hd = header();
        if (hd) {
            hd.classList.toggle('is-scrolled', y > 24);
            const probe = y + navH / 2;
            hd.classList.toggle('is-dark', fx.dark.some((b) => probe >= b.top && probe <= b.top + b.h));
        }
        const bar = $('#scroll-progress');
        if (bar) bar.style.transform = `scaleX(${clamp(y / fx.docH, 0, 1).toFixed(4)})`;

        // Hero: el contenido se aleja ligeramente al salir
        if (fx.hero && y < vh * 1.3) {
            const k = clamp(y / (vh * 0.9), 0, 1);
            fx.hero.copy.style.transform = y > 2 ? `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)` : '';
            fx.hero.copy.style.opacity = y > 2 ? (1 - k * 0.9).toFixed(3) : '';
            fx.hero.visual.style.transform = y > 2 ? `translate3d(0, ${(y * 0.07).toFixed(1)}px, 0)` : '';
        }

        // Parallax
        fx.parallax.forEach((p) => {
            const c = p.center - (y + vh / 2);
            if (Math.abs(c) > vh * 1.4) return;
            p.el.style.transform = `translate3d(0, ${(-c * p.speed).toFixed(1)}px, 0)`;
        });

        // Manifiesto: palabras que se encienden
        if (fx.manifestoBox && fx.manifestoWords.length) {
            const b = fx.manifestoBox;
            const start = b.top - vh * 0.82;
            const end = b.top + b.h - vh * 0.5;
            const p = clamp((y - start) / (end - start), 0, 1);
            const n = fx.manifestoWords.length;
            fx.manifestoWords.forEach((w, i) => {
                const v = clamp((p * n * 1.12 - i) / 3, 0, 1);
                w.style.opacity = (0.14 + 0.86 * v).toFixed(3);
            });
        }

        // Tarjetas apiladas: las anteriores se reducen y oscurecen
        if (fx.stack.length && isStackLayout()) {
            const rootFont = parseFloat(getComputedStyle(root).fontSize) || 16;
            fx.stack.forEach((card, i) => {
                const next = fx.stack[i + 1];
                if (!next) { card.style.removeProperty('--s'); card.style.removeProperty('--o'); return; }
                const stickyTop = navH + rootFont + i * rootFont * 0.9;
                const nextTop = next.getBoundingClientRect().top;
                const h = card.offsetHeight || 1;
                const q = clamp(1 - (nextTop - stickyTop) / h, 0, 1);
                card.style.setProperty('--s', (1 - q * 0.055).toFixed(4));
                card.style.setProperty('--o', (q * 0.5).toFixed(3));
            });
        } else if (fx.stack.length) {
            fx.stack.forEach((card) => { card.style.removeProperty('--s'); card.style.removeProperty('--o'); });
        }

        // Línea del proceso
        if (fx.stepsBox) {
            const b = fx.stepsBox;
            const range = Math.max(b.h, vh * 0.5);
            const p = clamp((y + vh * 0.72 - b.top) / range, 0, 1);
            fx.steps.style.setProperty('--p', p.toFixed(4));
            const n = fx.stepItems.length;
            fx.stepItems.forEach((s, i) => s.classList.toggle('is-active', p >= i / n + 0.03));
        }
    }

    function initScrollFx() {
        fx.hero = { copy: $('.hero-copy'), visual: $('.hero-visual') };
        if (!fx.hero.copy || !fx.hero.visual) fx.hero = null;

        fx.manifesto = $('.manifesto-text');
        if (fx.manifesto) fx.manifestoWords = splitWords(fx.manifesto, { mask: false });
        fx.steps = $('#steps');
        fx.stepItems = $$('.step', fx.steps || document);
        fx.stack = $$('.stack-card');

        measure();

        const loop = () => {
            const y = window.scrollY;
            if (y !== fx.y || fx.dirty) {
                fx.y = y;
                fx.dirty = false;
                updateFx();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        let resizeTimer;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 150); }, { passive: true });
        window.addEventListener('load', measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        if ('ResizeObserver' in window) {
            let t;
            new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 120); }).observe(document.body);
        }
    }

    /* ======================================================================
       10. CONTADORES
       ====================================================================== */
    function initCounters() {
        const els = $$('[data-count]');
        if (!els.length) return;

        const format = (el, n) => `${el.dataset.prefix || ''}${Math.round(n).toLocaleString('es-MX')}${el.dataset.suffix || ''}`;
        const run = (el) => {
            const to = parseFloat(el.dataset.count);
            const from = parseFloat(el.dataset.from || 0);
            const dur = 2400;
            const t0 = performance.now();
            const step = (now) => {
                const t = clamp((now - t0) / dur, 0, 1);
                el.textContent = format(el, lerp(from, to, 1 - Math.pow(1 - t, 4)));
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };

        if (reduceMotion || !('IntersectionObserver' in window)) return;

        els.forEach((el) => { el.textContent = format(el, parseFloat(el.dataset.from || 0)); });
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                run(entry.target);
                io.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        els.forEach((el) => io.observe(el));
    }

    /* ======================================================================
       11. FAQ (acordeón accesible)
       ====================================================================== */
    function initFaq() {
        const items = $$('.faq-item');
        items.forEach((item) => {
            const btn = $('.faq-q', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((other) => {
                    other.classList.remove('is-open');
                    $('.faq-q', other).setAttribute('aria-expanded', 'false');
                });
                item.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', String(open));
            });
        });
    }

    /* ======================================================================
       12. FORMULARIO → WHATSAPP
       ====================================================================== */
    function initForm() {
        const form = $('#quote-form');
        if (!form) return;
        const success = $('#form-success');
        const fallback = $('#form-fallback');
        const submitBtn = $('#form-submit');
        const phone = $('#f-tel');

        const digits = (v) => v.replace(/\D/g, '');
        const normalizePhone = (v) => {
            let d = digits(v);
            if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
            if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
            return d;
        };

        phone.addEventListener('input', () => {
            const d = normalizePhone(phone.value).slice(0, 10);
            phone.value = d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
        });

        $$('.field--select select', form).forEach((sel) => {
            const sync = () => sel.parentElement.classList.toggle('is-filled', !!sel.value);
            sel.addEventListener('change', sync);
            sync();
        });

        const rules = {
            nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
            empresa: (v) => (v.trim().length >= 2 ? '' : 'Indícanos el nombre de tu empresa o negocio.'),
            telefono: (v) => (normalizePhone(v).length === 10 ? '' : 'Escribe un teléfono de 10 dígitos.'),
            correo: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa el formato del correo.'),
            giro: (v) => (v ? '' : 'Selecciona el giro de tu negocio.')
        };

        const setError = (input, message) => {
            const field = input.closest('.field');
            const err = $('.err', field);
            field.classList.toggle('has-error', !!message);
            input.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (err) err.textContent = message;
        };
        const validateField = (input) => {
            const rule = rules[input.name];
            if (!rule) return true;
            const msg = rule(input.value);
            setError(input, msg);
            return !msg;
        };

        $$('input, select, textarea', form).forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) validateField(input); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = $$('input, select, textarea', form);
            const invalid = inputs.filter((i) => !validateField(i));
            if (invalid.length) { invalid[0].focus(); return; }

            const data = Object.fromEntries(new FormData(form).entries());
            const lines = [
                'Hola Capera Logistics, quiero solicitar una cotización de mensajería y paquetería.',
                '',
                `*Nombre:* ${data.nombre.trim()}`,
                `*Empresa:* ${data.empresa.trim()}`,
                `*Teléfono:* ${normalizePhone(data.telefono)}`,
                data.correo && data.correo.trim() ? `*Correo:* ${data.correo.trim()}` : null,
                `*Giro:* ${data.giro}`,
                data.volumen ? `*Entregas aproximadas:* ${data.volumen}` : null,
                data.mensaje && data.mensaje.trim() ? `*Mensaje:* ${data.mensaje.trim()}` : null
            ].filter((l) => l !== null);

            const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
            fallback.href = url;

            submitBtn.disabled = true;
            form.hidden = true;
            $('.form-head').hidden = true;
            success.hidden = false;
            window.open(url, '_blank', 'noopener');
        });

        $('#form-reset').addEventListener('click', () => {
            form.reset();
            $$('.field', form).forEach((f) => { f.classList.remove('has-error'); f.classList.remove('is-filled'); });
            submitBtn.disabled = false;
            success.hidden = true;
            form.hidden = false;
            $('.form-head').hidden = false;
        });
    }

    /* ======================================================================
       13. ARRANQUE
       ====================================================================== */
    function init() {
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        readNavH();
        initMenu();
        initAnchors();
        initActiveNav();
        initReveals();
        initSpotlight();
        initMagnetic();
        initHeroTilt();
        initEta();
        initHeroCanvas();
        initScrollFx();
        initCounters();
        initFaq();
        initForm();
        initPreloader();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
