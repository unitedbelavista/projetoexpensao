// Lista curada de fontes do Google Fonts que o admin pode escolher para
// títulos (serifadas/display) e corpo de texto (sans-serif), além dos
// helpers para carregar a fonte certa dinamicamente via <link>.
// Usado tanto em public/index.html (main.js) quanto em public/admin.html
// (admin.js).

var HEADING_FONT_OPTIONS = [
  { name: 'Playfair Display', fallback: 'serif' },
  { name: 'Merriweather', fallback: 'serif' },
  { name: 'Lora', fallback: 'serif' },
  { name: 'Cormorant Garamond', fallback: 'serif' },
  { name: 'Libre Baskerville', fallback: 'serif' },
  { name: 'EB Garamond', fallback: 'serif' },
  { name: 'Cinzel', fallback: 'serif' },
  { name: 'Abril Fatface', fallback: 'serif' },
  { name: 'Montserrat', fallback: 'sans-serif' },
  { name: 'Poppins', fallback: 'sans-serif' },
];

var BODY_FONT_OPTIONS = [
  { name: 'Montserrat', fallback: 'sans-serif' },
  { name: 'Inter', fallback: 'sans-serif' },
  { name: 'Open Sans', fallback: 'sans-serif' },
  { name: 'Lato', fallback: 'sans-serif' },
  { name: 'Roboto', fallback: 'sans-serif' },
  { name: 'Nunito Sans', fallback: 'sans-serif' },
  { name: 'Source Sans 3', fallback: 'sans-serif' },
  { name: 'Work Sans', fallback: 'sans-serif' },
  { name: 'Playfair Display', fallback: 'serif' },
  { name: 'Merriweather', fallback: 'serif' },
];

var ALL_FONT_OPTIONS = HEADING_FONT_OPTIONS.concat(BODY_FONT_OPTIONS).reduce(function (acc, f) {
  if (!acc.some(function (x) { return x.name === f.name; })) acc.push(f);
  return acc;
}, []);

function findFontOption(fontName) {
  return ALL_FONT_OPTIONS.find(function (f) { return f.name === fontName; });
}

function fontFamilyValue(fontName, fallbackCategory) {
  var opt = findFontOption(fontName);
  var fallback = fallbackCategory || (opt && opt.fallback) || 'sans-serif';
  return '"' + fontName + '", ' + fallback;
}

var _loadedGoogleFonts = {};

// Injeta um <link> do Google Fonts para a fonte pedida (idempotente - só
// injeta uma vez por nome de fonte).
function loadGoogleFont(fontName) {
  if (!fontName || _loadedGoogleFonts[fontName]) return;
  _loadedGoogleFonts[fontName] = true;
  var familyParam = fontName.replace(/ /g, '+') + ':wght@400;600;700';
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + familyParam + '&display=swap';
  document.head.appendChild(link);
}

// Aplica a fonte de título/corpo escolhida: carrega o Google Fonts e seta
// as variáveis CSS --font-heading / --font-body usadas em style.css.
function applySiteFonts(headingFontName, bodyFontName) {
  var heading = headingFontName || 'Playfair Display';
  var body = bodyFontName || 'Montserrat';
  loadGoogleFont(heading);
  loadGoogleFont(body);
  document.documentElement.style.setProperty('--font-heading', fontFamilyValue(heading, 'serif'));
  document.documentElement.style.setProperty('--font-body', fontFamilyValue(body, 'sans-serif'));
}
