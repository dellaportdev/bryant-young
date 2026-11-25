// Syntax highlighting: one combined regex per language, earliest match wins, first rule wins ties.
const tokenClass = {
    com: 'text-neutral-400 italic',
    str: 'text-emerald-700',
    kw: 'text-fuchsia-700',
    type: 'text-amber-700',
    fn: 'text-blue-700',
    num: 'text-amber-700',
    prop: 'text-blue-700',
    sel: 'text-fuchsia-700',
    var: 'text-sky-700'
};

// Tech chips: data-icon takes the same icon specs as fileIcons.
for (const chip of document.querySelectorAll('.chip[data-icon]')) chip.prepend(icon(chip.dataset.icon));

const jsKeywords = 'as|async|await|break|case|catch|class|const|continue|default|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|keyof|let|new|null|of|private|protected|public|readonly|return|static|switch|this|throw|true|try|type|typeof|undefined|var|void|while';
const phpKeywords = 'array|as|class|echo|else|elseif|false|fn|foreach|function|if|namespace|new|null|private|protected|public|require_once|return|static|true|use';

const languageRules = {
    js: [
        ['com', /\/\/.*|\/\*[\s\S]*?\*\//],
        ['str', /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/],
        ['kw', new RegExp(`\\b(?:${jsKeywords})\\b`)],
        ['type', /\b[A-Z][\w$]*/],
        ['fn', /\b[a-z_$][\w$]*(?=\()/],
        ['num', /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b/]
    ],
    scss: [
        ['com', /\/\/.*|\/\*[\s\S]*?\*\//],
        ['str', /"[^"\n]*"|'[^'\n]*'/],
        ['kw', /@[\w-]+/],
        ['var', /\$[\w-]+/],
        ['prop', /[\w-]+(?=\s*:[^;{}]*[;}])/],
        ['sel', /&[\w-]*|\.[a-zA-Z_-][\w-]*/],
        ['num', /#[\da-fA-F]{3,8}\b|\b\d*\.?\d+(?:%|[a-z]+)?/]
    ],
    html: [
        ['com', /<!--[\s\S]*?-->/],
        ['kw', /<\/?[\w:-]+|\/?>/],
        ['prop', /[\w:-]+(?==)/],
        ['str', /(?<==)(?:"[^"]*"|'[^']*')/]
    ],
    php: [
        ['com', /\/\/.*|#.*|\/\*[\s\S]*?\*\//],
        ['kw', /<\?php|\?>/],
        ['str', /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/],
        ['kw', new RegExp(`\\b(?:${phpKeywords})\\b`)],
        ['var', /\$\w+/],
        ['kw', /<\/?[a-zA-Z][\w-]*|(?<![-=?])\/?>/],
        ['type', /\b[A-Z]\w*/],
        ['fn', /\b[a-z_]\w*(?=\s*\()/],
        ['num', /\b\d+(?:\.\d+)?\b/]
    ]
};

const extensionLanguage = { js: 'js', ts: 'js', css: 'scss', scss: 'scss', html: 'markup', svelte: 'markup', vue: 'markup', php: 'php' };

const extensionOf = path => path.split('.').pop();

const escapeHtml = text => text.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));

// Sources are indented to match the page markup, so strip the shared indent.
function dedent(text) {
    const lines = text.replace(/^\s*\n|\s+$/g, '').split('\n');
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length));
    return lines.map(line => line.slice(indent)).join('\n');
}

// Markup files: tags as HTML, <script> bodies as JS/TS, <style> bodies as CSS.
function highlightMarkup(source) {
    const embeddedBlocks = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
    let output = '', lastIndex = 0;
    for (const match of source.matchAll(embeddedBlocks)) {
        const [openTag, body, closeTag, language] = match[1]
            ? [match[1], match[2], match[3], 'js']
            : [match[4], match[5], match[6], 'scss'];
        output += highlight(source.slice(lastIndex, match.index) + openTag, 'html')
            + highlight(body, language)
            + highlight(closeTag, 'html');
        lastIndex = match.index + match[0].length;
    }
    return output + highlight(source.slice(lastIndex), 'html');
}

function highlight(source, language) {
    if (language === 'markup') return highlightMarkup(source);
    const rules = languageRules[language];
    if (!rules) return escapeHtml(source);
    const combined = new RegExp(rules.map(([, pattern]) => `(${pattern.source})`).join('|'), 'g');
    let output = '', lastIndex = 0;
    for (const match of source.matchAll(combined)) {
        const groupIndex = match.findIndex((group, index) => index > 0 && group !== undefined);
        const tokenType = rules[groupIndex - 1][0];
        output += escapeHtml(source.slice(lastIndex, match.index))
            + `<span class="${tokenClass[tokenType]}">${escapeHtml(match[0])}</span>`;
        lastIndex = match.index + match[0].length;
    }
    return output + escapeHtml(source.slice(lastIndex));
}

// File-type icons: plain in the sidebar, colored in panel headers. Anything unmapped gets a generic code file.
// "si:<slug>" entries are Simple Icons logos for brands Font Awesome Free doesn't have.
const fileIcons = {
    js: ['fa-brands fa-js', 'text-amber-500'],
    ts: ['si:typescript', 'text-blue-600'],
    html: ['fa-brands fa-html5', 'text-orange-600'],
    css: ['fa-brands fa-css3-alt', 'text-blue-600'],
    scss: ['fa-brands fa-sass', 'text-pink-500'],
    php: ['fa-brands fa-php', 'text-indigo-500'],
    svelte: ['si:svelte', 'text-orange-600'],
    vue: ['fa-brands fa-vuejs', 'text-emerald-600']
};

const defaultFileIcon = ['fa-regular fa-file-code', 'text-neutral-400'];

// Per-file overrides from data-icon / data-icon-color, keyed by "exampleId/path".
const iconOverrides = new Map();

function icon(shape, color = '') {
    if (shape.startsWith('si:')) {
        const logo = document.createElement('span');
        logo.className = `inline-block h-[1em] w-[1.25em] shrink-0 bg-current ${color}`;
        logo.style.mask = `url(https://cdn.simpleicons.org/${shape.slice(3)}) center / contain no-repeat`;
        logo.setAttribute('aria-hidden', 'true');
        return logo;
    }
    const glyph = document.createElement('i');
    glyph.className = `${shape} fa-fw ${color}`;
    glyph.setAttribute('aria-hidden', 'true');
    return glyph;
}

function fileIcon(fileKey, colored) {
    const [shape, color] = iconOverrides.get(fileKey) || fileIcons[extensionOf(fileKey)] || defaultFileIcon;
    return icon(shape, colored ? color : '');
}

// Sidebar: folders from data-path become a nested tree, files become buttons.
function buildTree(paths) {
    const root = {};
    for (const path of paths) {
        const segments = path.split('/');
        let folder = root;
        for (const dirName of segments.slice(0, -1)) folder = folder[dirName + '/'] ??= {};
        folder[segments.at(-1)] = path;
    }
    return root;
}

// Sources are inline, or fetched from data-source (relative to the page's examples/ folder) so outside files need no escaping.
const sourceBase = new URL('examples/', location.href);
const sourceScripts = [...document.querySelectorAll('script[data-path]')];
const sourceText = new Map(await Promise.all(sourceScripts.map(async script => {
    if (!script.dataset.source) return [script, script.textContent.replace(/<\s(\/?script\b)/gi, '<$1')];
    try {
        const response = await fetch(new URL(script.dataset.source, sourceBase));
        if (!response.ok) throw new Error(response.status);
        return [script, (await response.text()).replace(/\r\n?/g, '\n')];
    } catch (error) {
        return [script, `Could not load ${script.dataset.source} (${error.message})`];
    }
})));

const nav = document.getElementById('nav');
const examples = [...document.querySelectorAll('[data-example]')];
const exampleLinks = [];
const fileButtons = [];
const filePanels = [];
const activeFileByExample = {};

function renderTree(folder, exampleId, depth, list) {
    for (const [name, entry] of Object.entries(folder)) {
        const item = document.createElement('li');
        item.style.paddingLeft = depth + 'rem';
        list.append(item);
        if (typeof entry === 'object') {
            item.className = 'flex items-center gap-1.5 py-0.5 text-neutral-400';
            item.append(icon('fa-regular fa-folder-open'), name.slice(0, -1));
            renderTree(entry, exampleId, depth + 1, list);
            continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.file = `${exampleId}/${entry}`;
        button.className = 'flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-neutral-600 hover:bg-neutral-100 aria-pressed:bg-neutral-100 aria-pressed:text-neutral-900';
        button.append(fileIcon(button.dataset.file), name);
        button.addEventListener('click', () => {
            activeFileByExample[exampleId] = button.dataset.file;
            if (location.hash.slice(1) === exampleId) selectFile(button.dataset.file);
            else location.hash = exampleId;
        });
        item.append(button);
        fileButtons.push(button);
    }
}

// Replace each source script with a highlighted panel and add the example to the sidebar.
// The fade replays whenever an element leaves display:none, so swapping needs no extra JS.
for (const example of examples) {
    const exampleId = example.dataset.example;
    const title = example.querySelector('h2');
    example.firstElementChild.classList.add('motion-safe:animate-swap');
    const scripts = [...example.querySelectorAll('script[data-path]')];
    const paths = scripts.map(script => script.dataset.path);

    const label = document.createElement('p');
    label.className = 'text-[11px] uppercase tracking-wider text-neutral-500';
    label.textContent = `Example ${exampleId}`;
    title.before(label);

    for (const script of scripts) {
        const path = script.dataset.path;
        const fileKey = `${exampleId}/${path}`;
        if (script.dataset.icon) iconOverrides.set(fileKey, [script.dataset.icon, script.dataset.iconColor || '']);

        const panel = document.createElement('div');
        panel.dataset.filePanel = fileKey;
        panel.className = 'mt-4 overflow-hidden rounded-lg border border-neutral-200 motion-safe:animate-swap';
        panel.hidden = true;

        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-mono text-xs text-neutral-500';
        header.append(fileIcon(fileKey, true), path);

        const pre = document.createElement('pre');
        pre.className = 'overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [tab-size:4]';
        const code = document.createElement('code');
        // Inline samples write "< /script>" so the browser doesn't end the block early; the space is removed when loaded.
        code.innerHTML = highlight(dedent(sourceText.get(script)), extensionLanguage[extensionOf(path)]);
        pre.append(code);

        panel.append(header, pre);
        script.replaceWith(panel);
        filePanels.push(panel);
    }

    const block = document.createElement('div');
    const link = document.createElement('a');
    link.href = '#' + exampleId;
    link.className = 'block rounded-md px-3 py-2 hover:bg-neutral-100 aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white';
    link.innerHTML = `<span class="block text-[11px] uppercase tracking-wider opacity-60">Example ${exampleId}</span><span class="font-medium"></span>`;
    link.lastChild.textContent = title.textContent;
    exampleLinks.push(link);

    const fileList = document.createElement('ul');
    fileList.className = 'mt-2 ml-3 border-l border-neutral-200 pl-3 font-mono text-[13px]';
    renderTree(buildTree(paths), exampleId, 0, fileList);

    block.append(link, fileList);
    nav.append(block);
}

// The hash picks the example; file buttons swap panels within it and are remembered per example.
function selectFile(fileKey) {
    filePanels.forEach(panel => panel.hidden = panel.dataset.filePanel !== fileKey);
    fileButtons.forEach(button => button.setAttribute('aria-pressed', button.dataset.file === fileKey));
}

function showExample(scrollIntoView) {
    const hashId = location.hash.slice(1);
    const current = examples.find(example => example.dataset.example === hashId) || examples[0];
    const currentId = current.dataset.example;
    examples.forEach(example => example.hidden = example !== current);
    exampleLinks.forEach(link => link.getAttribute('href') === '#' + currentId
        ? link.setAttribute('aria-current', 'page')
        : link.removeAttribute('aria-current'));
    selectFile(activeFileByExample[currentId] || filePanels.find(panel => current.contains(panel)).dataset.filePanel);
    if (scrollIntoView && matchMedia('(max-width: 47.99rem)').matches) current.scrollIntoView();
}

addEventListener('hashchange', () => showExample(true));
showExample(false);

// Keep the page hidden until the Tailwind CDN has styled it, so nothing pops on load.
const layout = document.getElementById('layout');
(function reveal(frames) {
    if (getComputedStyle(layout).display === 'grid' || frames > 120) document.documentElement.style.visibility = '';
    else requestAnimationFrame(() => reveal(frames + 1));
})(0);