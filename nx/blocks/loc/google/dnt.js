import { addDnt as addDntGlaas, removeDnt as removeDntGlaas } from '../glaas/dnt.js';

const PARSER = new DOMParser();

// The google dnt layer first uses the glaas dnt layer to add the dnt attributes
// Then it converts the glaas html to dom that google translate can process

export async function addDnt(inputText, config, { fileType = 'html', reset = false } = {}) {
  const glaasHtml = await addDntGlaas(inputText, config, { fileType, reset });
  const dom = PARSER.parseFromString(glaasHtml, 'text/html');
  const dntEls = dom.querySelectorAll('[translate="no"]');
  dntEls.forEach((el) => {
    const nestedTranslates = el.querySelectorAll('[translate="no"]');
    nestedTranslates.forEach((nestedEl) => nestedEl.removeAttribute('translate'));

    el.dataset.innerHtml = el.innerHTML;
    el.innerHTML = '';
    el.removeAttribute('translate');
  });

  return dom.documentElement.outerHTML;
}

function unwrapDataInnerHtml(dom) {
  const dntEls = dom.querySelectorAll('[data-inner-html]');
  dntEls.forEach((el) => {
    el.innerHTML = el.dataset.innerHtml;
    delete el.dataset.innerHtml;
  });
}

export async function removeDnt(inputHtml, org, repo, { fileType = 'html' } = {}) {
  let html = inputHtml;

  if (fileType === 'html') {
    html = await removeDntGlaas(html, org, repo, { fileType });
  }

  const dom = PARSER.parseFromString(html, 'text/html');
  unwrapDataInnerHtml(dom);

  const contents = dom.querySelector('main')?.outerHTML || dom.body.outerHTML;

  if (fileType === 'html') {
    return `<body>${contents}</body>`;
  }

  return removeDntGlaas(contents, org, repo, { fileType }); // json
}
