const AUTO_BLOCKS = [
  { 'nx-fragment': '/fragments/' },
  { 'nx-youtube': 'https://www.youtube.com' },
];

function getEnv() {
  const { host } = new URL(window.location.href);
  if (!['.page', 'local'].some((check) => host.includes(check))) return 'prod';
  if (['.hlx.', '.aem.'].some((check) => host.includes(check))) return 'stage';
  return 'dev';
}

export const [setConfig, getConfig] = (() => {
  let config;
  return [
    (conf = {}) => {
      config = {
        ...conf,
        env: getEnv(),
        nxBase: `${import.meta.url.replace('/scripts/nexter.js', '')}`,
      };
      return config;
    },
    () => (config || setConfig()),
  ];
})();

export function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = doc.head.querySelector(`meta[${attr}="${name}"]`);
  return meta && meta.content;
}

export async function loadStyle(href) {
  return new Promise((resolve) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

export async function loadBlock(block) {
  const { classList } = block;
  let name = classList[0];
  const isNx = name.startsWith('nx-');
  if (isNx) name = name.replace('nx-', '');
  block.dataset.blockName = name;
  const { nxBase, codeBase = '' } = getConfig();
  const path = isNx ? `${nxBase}/blocks` : `${codeBase}/blocks`;
  const blockPath = `${path}/${name}/${name}`;
  const loaded = [new Promise((resolve) => {
    (async () => {
      try {
        await (await import(`${blockPath}.js`)).default(block);
      } catch { console.log(`Failed loading: ${name}`); }
      resolve();
    })();
  })];
  if (!classList.contains('cmp')) loaded.push(loadStyle(`${blockPath}.css`));
  await Promise.all(loaded);
  return block;
}

function decorateContent(el) {
  const children = [el];
  let child = el;
  while (child) {
    child = child.nextElementSibling;
    if (child && child.nodeName !== 'DIV') children.push(child);
  }
  const block = document.createElement('div');
  block.className = 'content';
  block.append(...children);
  return block;
}

function decorateDefaults(el) {
  const firstChild = ':scope > *:not(div):first-child';
  const afterBlock = ':scope > div + *:not(div)';
  const children = el.querySelectorAll(`${firstChild}, ${afterBlock}`);
  children.forEach((child) => {
    const prev = child.previousElementSibling;
    const content = decorateContent(child);
    if (prev) {
      prev.insertAdjacentElement('afterend', content);
    } else {
      el.insertAdjacentElement('afterbegin', content);
    }
  });
}

function decorateLinks(el) {
  const anchors = [...el.querySelectorAll('a')];
  return anchors.reduce((acc, a) => {
    const { href } = a;
    const found = AUTO_BLOCKS.some((pattern) => {
      const key = Object.keys(pattern)[0];
      if (!href.includes(pattern[key])) return false;
      a.classList.add(key, 'auto-block');
      return true;
    });
    if (found) acc.push(a);
    return acc;
  }, []);
}

function decorateSections(parent, isDoc) {
  const selector = isDoc ? 'main > div' : ':scope > div';
  return [...parent.querySelectorAll(selector)].map((el) => {
    el.classList.add('section');
    el.dataset.status = 'decorated';
    el.autoBlocks = decorateLinks(el);
    el.blocks = [...el.querySelectorAll(':scope > div[class]')];
    decorateDefaults(el);
    return el;
  });
}

function decorateHeader() {
  const header = document.querySelector('header');
  if (!header) return;
  const meta = getMetadata('header') || 'nx-nav cmp';
  if (meta === 'off') {
    header.remove();
    return;
  }
  header.dataset.status = 'decorated';
  header.className = meta;
  if (header.classList.contains('nx-nav')) {
    document.body.classList.add('nx-app');
  }
}

export async function loadArea(area = document) {
  const isDoc = area === document;
  if (isDoc) {
    if (getMetadata('signin')) await import('../utils/signin.js');
    document.documentElement.lang = 'en';
    decorateHeader();
  }
  const sections = decorateSections(area, isDoc);
  for (const [idx, section] of sections.entries()) {
    await Promise.all(section.autoBlocks.map((block) => loadBlock(block)));
    await Promise.all(section.blocks.map((block) => loadBlock(block)));
    delete section.dataset.status;
    if (isDoc && idx === 0) await import('./postlcp.js');
  }
  if (isDoc) import('./lazy.js');
}

export function loadFeedbackBot() {
  const button = document.createElement('button');
  button.className = 'feedback-button';
  button.textContent = 'Feedback';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 20px;
    background: #1473e6;
    color: white;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
  `;

  button.addEventListener('click', async () => {
    const container = document.createElement('div');
    container.className = 'feedback-widget';
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
    `;

    const block = document.createElement('div');
    block.className = 'feedback';
    container.appendChild(block);
    document.body.appendChild(container);

    await loadBlock(block);
  });

  document.body.appendChild(button);
}
