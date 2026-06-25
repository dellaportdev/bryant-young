(function () {
    const canvas = document.getElementById('matrix');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const FONT_SIZE = 13;
    const TRAIL = 16;
    const MIN_SPEED = 0.03;
    const MAX_SPEED = 0.12;
    const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈ0123456789'.split('');

    const COLLISION_TARGET = 'main > .card';
    const COLLISION_OFFSET = 25;
    const SPLASH_COUNT = 9;
    const SPLASH_GRAVITY = 0.14;
    const MAX_PARTICLES = 800;

    const HB = (function () {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--highlight-rgb').trim();
        const p = v.split(/[\s,]+/).map(Number);
        return p.length === 3 && p.every(x => !isNaN(x)) ? p : [100, 149, 237];
    })();

    const HEAD_STYLE = 'rgb(235, 244, 255)';
    const trailStyle = new Array(TRAIL);
    for (let i = 0; i < TRAIL; i++) {
        const a = 1 - i / TRAIL;
        const m = Math.min(1, i / 3);
        const r = Math.round(225 + (HB[0] - 225) * m);
        const g = Math.round(240 + (HB[1] - 240) * m);
        const b = Math.round(255 + (HB[2] - 255) * m);
        trailStyle[i] = 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.85).toFixed(3) + ')';
    }

    let W, H, cols, rows, columns, dpr, glow, glowSize;
    let particles = [];
    let cardEl = null;
    let cardBox = null;

    function rand(min, max) { return min + Math.random() * (max - min); }
    function glyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

    function buildGlow() {
        glowSize = FONT_SIZE * 3;
        glow = document.createElement('canvas');
        glow.width = glowSize;
        glow.height = glowSize;
        const g = glow.getContext('2d');
        const grd = g.createRadialGradient(glowSize / 2, glowSize / 2, 0, glowSize / 2, glowSize / 2, glowSize / 2);
        grd.addColorStop(0, 'rgba(' + HB[0] + ',' + HB[1] + ',' + HB[2] + ',0.55)');
        grd.addColorStop(1, 'rgba(' + HB[0] + ',' + HB[1] + ',' + HB[2] + ',0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, glowSize, glowSize);
    }

    function restColumn(col) {
        col.resting = true;
        col.wait = rand(60, 600);
        col.chars.length = 0;
    }

    function init() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = FONT_SIZE + "px 'Courier New', monospace";
        ctx.textBaseline = 'top';

        cols = Math.ceil(W / FONT_SIZE);
        rows = Math.ceil(H / FONT_SIZE);
        columns = new Array(cols);
        for (let c = 0; c < cols; c++) {
            columns[c] = {
                y: rand(-H * 4, 0) / FONT_SIZE,
                speed: rand(MIN_SPEED, MAX_SPEED),
                lastRow: -1,
                head: -1,
                chars: [],
                resting: false,
                wait: 0
            };
        }

        buildGlow();
        cardEl = document.querySelector(COLLISION_TARGET);
    }

    function updateCardBox() {
        if (!cardEl) { cardBox = null; return; }
        const r = cardEl.getBoundingClientRect();
        cardBox = { x1: r.left, x2: r.right, y: r.top + COLLISION_OFFSET };
    }

    function spawnSplash(x, y) {
        if (particles.length > MAX_PARTICLES) return;
        for (let k = 0; k < SPLASH_COUNT; k++) {
            particles.push({
                x: x,
                y: y,
                vx: rand(-1.6, 1.6),
                vy: rand(-2.8, -0.6),
                life: 1,
                decay: rand(0.014, 0.03),
                size: rand(1, 2.4)
            });
        }
    }

    function update(dt) {
        updateCardBox();

        for (let c = 0; c < cols; c++) {
            const col = columns[c];

            if (col.resting) {
                col.wait -= dt;
                if (col.wait <= 0) {
                    col.resting = false;
                    col.y = rand(-20, -2);
                    col.speed = rand(MIN_SPEED, MAX_SPEED);
                    col.lastRow = Math.floor(col.y) - 1;
                }
                continue;
            }

            col.y += col.speed * dt;
            const head = Math.floor(col.y);
            col.head = head;

            while (col.lastRow < head) {
                col.chars.unshift(glyph());
                if (col.chars.length > TRAIL) col.chars.pop();
                col.lastRow++;
            }

            if (cardBox) {
                const cx = c * FONT_SIZE + FONT_SIZE * 0.5;
                const hy = col.y * FONT_SIZE;
                if (cx >= cardBox.x1 && cx <= cardBox.x2 && hy >= cardBox.y) {
                    spawnSplash(cx, cardBox.y);
                    restColumn(col);
                    continue;
                }
            }

            if ((head - col.chars.length) * FONT_SIZE > H) {
                restColumn(col);
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += SPLASH_GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0 || p.y > H) particles.splice(i, 1);
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);

        for (let i = 1; i < TRAIL; i++) {
            ctx.fillStyle = trailStyle[i];
            for (let c = 0; c < cols; c++) {
                const col = columns[c];
                if (i >= col.chars.length) continue;
                const row = col.head - i;
                if (row < 0 || row > rows) continue;
                ctx.fillText(col.chars[i], c * FONT_SIZE, row * FONT_SIZE);
            }
        }

        const goff = glowSize / 2 - FONT_SIZE / 2;
        for (let c = 0; c < cols; c++) {
            const col = columns[c];
            if (col.chars.length === 0) continue;
            const row = col.head;
            if (row < 0 || row > rows) continue;
            ctx.drawImage(glow, c * FONT_SIZE - goff, row * FONT_SIZE - goff);
        }

        ctx.fillStyle = HEAD_STYLE;
        for (let c = 0; c < cols; c++) {
            const col = columns[c];
            if (col.chars.length === 0) continue;
            const row = col.head;
            if (row < 0 || row > rows) continue;
            ctx.fillText(col.chars[0], c * FONT_SIZE, row * FONT_SIZE);
        }

        if (particles.length) {
            ctx.fillStyle = 'rgb(220, 236, 255)';
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                ctx.globalAlpha = p.life < 1 ? p.life : 1;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
            ctx.globalAlpha = 1;
        }
    }

    let last = performance.now();
    function frame(now) {
        let dt = (now - last) / 16.6667;
        last = now;
        if (dt > 3) dt = 3;
        update(dt);
        render();
        requestAnimationFrame(frame);
    }

    init();
    window.addEventListener('resize', init);
    if (!reduce) requestAnimationFrame(frame);
})();