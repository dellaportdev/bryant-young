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

    const HB = (function () {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--highlight-rgb').trim();
        const p = v.split(/[\s,]+/).map(Number);
        return p.length === 3 && p.every(x => !isNaN(x)) ? p : [100, 149, 237];
    })();

    let W, H, cols, columns, dpr;

    function rand(min, max) { return min + Math.random() * (max - min); }
    function glyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

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
        columns = new Array(cols);
        for (let c = 0; c < cols; c++) {
            columns[c] = {
                y: rand(-H * 4, 0) / FONT_SIZE,
                speed: rand(MIN_SPEED, MAX_SPEED),
                lastRow: -1,
                chars: [],
                resting: false,
                wait: 0
            };
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const rows = Math.ceil(H / FONT_SIZE);

        for (let c = 0; c < cols; c++) {
            const col = columns[c];
            col.y += col.speed;
            const head = Math.floor(col.y);

            if (head !== col.lastRow) {
                col.chars.unshift(glyph());
                if (col.chars.length > TRAIL) col.chars.pop();
                col.lastRow = head;
            }

            const x = c * FONT_SIZE;
            for (let i = 0; i < col.chars.length; i++) {
                const row = head - i;
                if (row < 0 || row > rows) continue;
                const y = row * FONT_SIZE;
                const a = 1 - i / TRAIL;
                if (a <= 0) continue;

                if (i === 0) {
                    ctx.fillStyle = 'rgba(235, 244, 255, ' + a + ')';
                    ctx.shadowColor = 'rgba(' + HB[0] + ',' + HB[1] + ',' + HB[2] + ',0.9)';
                    ctx.shadowBlur = 8;
                } else {
                    const m = Math.min(1, i / 3);
                    const r = Math.round(225 + (HB[0] - 225) * m);
                    const g = Math.round(240 + (HB[1] - 240) * m);
                    const b = Math.round(255 + (HB[2] - 255) * m);
                    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.85) + ')';
                    ctx.shadowBlur = 0;
                }
                ctx.fillText(col.chars[i], x, y);
            }
            ctx.shadowBlur = 0;

            if (col.resting) {
                col.wait--;
                if (col.wait <= 0) {
                    col.resting = false;
                    col.y = rand(-20, -2);
                    col.speed = rand(MIN_SPEED, MAX_SPEED);
                    col.lastRow = -1;
                    col.chars.length = 0;
                }
            } else if ((head - col.chars.length) * FONT_SIZE > H) {
                col.resting = true;
                col.wait = rand(60, 600);
            }
        }

        requestAnimationFrame(draw);
    }

    init();
    window.addEventListener('resize', init);
    if (!reduce) draw();
})();