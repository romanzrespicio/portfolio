console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'
    : '/portfolio/';

const pages = [
  { url: '', title: 'Home' },
  { url: 'resume/', title: 'Resume' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/romanzrespicio', title: 'GitHub' },
];

const nav = document.createElement('nav');
document.body.prepend(nav);

for (const p of pages) {
  let url = p.url;
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  const a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname,
  );

  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `<label class="color-scheme" style="position:fixed;top:max(1rem,env(safe-area-inset-top));right:max(1rem,env(safe-area-inset-right));left:auto;z-index:1000">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`,
);

const themeSelect = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  if (themeSelect) {
    themeSelect.value = colorScheme;
  }
}

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

themeSelect?.addEventListener('input', (event) => {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

const mailForm = document.querySelector('form[action^="mailto:"]');
mailForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const params = [];
  for (const [name, value] of data) {
    params.push(
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    );
  }
  const url = `${form.action}?${params.join('&')}`;
  location.href = url;
});
