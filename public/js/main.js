const state = { items: [], selectedItem: null, siteContent: null, requirePayerName: true };

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadItems() {
  const container = document.getElementById('items');
  try {
    const res = await fetch('/.netlify/functions/items');
    const data = await res.json();
    state.items = data.items || [];
    renderItems();
  } catch (err) {
    container.innerHTML = '<p class="loading">Não foi possível carregar os itens agora. Tente novamente em instantes.</p>';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadSiteContent() {
  let data;
  try {
    const res = await fetch('/.netlify/functions/site-content');
    if (!res.ok) return;
    data = await res.json();
    state.siteContent = data;
  } catch (err) {
    // se a requisicao falhar, a pagina mantem os textos padrao que ja estao no HTML
    return;
  }

  // Cada bloco abaixo e isolado: se um campo novo der problema, os demais
  // (incluindo titulo/texto/pilares, que ja existiam antes) continuam
  // sendo aplicados normalmente.
  try {
    if (data.hero_title) document.getElementById('hero-title').textContent = data.hero_title;
    if (data.hero_lead) document.getElementById('hero-lead').textContent = data.hero_lead;
    renderPillars(data.pillars_title, data.pillars);
  } catch (err) { /* titulo/texto/pilares seguem com o valor padrao do HTML */ }

  try {
    applyHeroBackground(data.hero_background_url);
  } catch (err) { /* fundo segue a cor padrao */ }

  try {
    applyHeroTextColors(data.hero_title_color, data.hero_eyebrow_color, data.hero_lead_color);
  } catch (err) { /* cores seguem o padrao do CSS */ }

  try {
    applySiteBackgroundColor(data.site_background_color);
  } catch (err) { /* fundo do site segue o padrao do CSS */ }

  try {
    applyRequirePayerName(data.require_payer_name);
  } catch (err) { /* nome continua obrigatorio por padrao (valor inicial do state) */ }

  try {
    if (typeof applySiteFonts === 'function') {
      applySiteFonts(data.heading_font, data.body_font);
    }
  } catch (err) { /* fontes seguem o padrao do CSS */ }

  try {
    if (data.pix_intro_text) document.getElementById('pix-intro-text').textContent = data.pix_intro_text;
    const pixKey = data.pix_key || 'belavista@igrejaunited.com';
    document.getElementById('pix-key-display').textContent = pixKey;
    document.getElementById('pix-merchant-display').textContent = data.pix_merchant_name
      ? `— ${data.pix_merchant_name}`
      : '';
    document.getElementById('modal-pix-key').textContent = pixKey;

    if (typeof renderPixQrCode === 'function') {
      const qrOpts = {
        key: pixKey,
        merchantName: data.pix_merchant_name,
        merchantCity: data.pix_merchant_city,
      };
      renderPixQrCode('pix-qr-public', qrOpts);
      renderPixQrCode('pix-qr-modal', qrOpts);
    }
  } catch (err) { /* chave Pix/QR seguem o valor padrao do HTML */ }

  try {
    if (data.amount_warning_text) {
      document.getElementById('amount-warning-text').textContent = data.amount_warning_text;
    }
  } catch (err) { /* aviso segue o texto padrao do HTML */ }
}

// Cores do texto do topo (título, subtítulo/eyebrow e corpo de
// introdução) — editáveis pelo admin porque uma foto de fundo clara pode
// fazer o texto claro padrão "sumir" por falta de contraste. Cada uma é
// independente, igual à escolha de fonte de título x corpo de texto.
function applyHeroTextColors(titleColor, eyebrowColor, leadColor) {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const setVar = (name, value) => {
    if (value) hero.style.setProperty(name, value);
    else hero.style.removeProperty(name);
  };
  setVar('--hero-title-color', titleColor);
  setVar('--hero-eyebrow-color', eyebrowColor);
  setVar('--hero-lead-color', leadColor);
}

// Cor de fundo de todo o site (diferente da cor/foto do cabecalho "hero",
// que e separada). Aplicada na raiz do documento para sobrescrever a
// variavel --bg definida em style.css, afetando o corpo da pagina, a
// area ao redor dos cards de pilares/itens e o rodape.
function applySiteBackgroundColor(color) {
  if (color) document.documentElement.style.setProperty('--bg', color);
  else document.documentElement.style.removeProperty('--bg');
}

// Controla se o campo "Seu nome" no formulario de oferta e obrigatorio -
// configuravel pelo toggle "Exigir nome de quem esta ofertando" no painel
// admin. Atualiza o atributo "required" nativo do input e o texto do
// label, e state.requirePayerName e checado de novo em submitOffer() como
// validacao extra (o servidor tambem valida, em register-offer.js).
function applyRequirePayerName(required) {
  state.requirePayerName = required !== false;
  const input = document.getElementById('modal-name');
  const label = document.getElementById('modal-name-label');
  if (input) input.required = state.requirePayerName;
  if (label) label.textContent = state.requirePayerName ? 'Seu nome' : 'Seu nome (opcional)';
}

function applyHeroBackground(url) {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  if (url) {
    hero.style.backgroundImage = `linear-gradient(rgba(61, 43, 31, 0.55), rgba(61, 43, 31, 0.55)), url("${url}")`;
    hero.classList.add('has-bg-image');
  } else {
    hero.style.backgroundImage = '';
    hero.classList.remove('has-bg-image');
  }
}

// Efeito 3D: o card acompanha o mouse com uma leve inclinação em
// perspectiva, voltando ao normal quando o mouse sai.
function attachTiltEffect(card) {
  const maxTilt = 10;
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - py) * maxTilt;
    const rotateY = (px - 0.5) * maxTilt;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}

function renderPillars(title, pillars) {
  if (!Array.isArray(pillars) || !pillars.length) return;
  document.getElementById('pillars-title').textContent = title || 'Nossos Pilares';
  document.getElementById('pillars-grid').innerHTML = pillars.map((p, idx) => `
    <article class="pillar-card">
      <span class="pillar-number">${idx + 1}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.text)}</p>
    </article>
  `).join('');
  document.getElementById('pillars').hidden = false;
  document.querySelectorAll('.pillar-card').forEach(attachTiltEffect);
}

function renderItems() {
  const container = document.getElementById('items');
  if (!state.items.length) {
    container.innerHTML = '<p class="loading">Nenhum item cadastrado no momento.</p>';
    return;
  }

  container.innerHTML = state.items.map((item) => {
    const pct = item.target_amount > 0 ? Math.min(100, (item.raised_amount / item.target_amount) * 100) : 0;
    const image = item.image_url ? `<img src="${item.image_url}" alt="${item.name}" />` : '';
    return `
      <article class="item-card">
        ${image}
        <h3>${item.name}</h3>
        ${item.description ? `<p class="desc">${item.description}</p>` : ''}
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-labels">
          <span><strong>${currency(item.raised_amount)}</strong> arrecadado</span>
          <span>meta ${currency(item.target_amount)}</span>
        </div>
        <button class="btn-primary" data-item-id="${item.id}">Ofertar para este item</button>
      </article>
    `;
  }).join('');

  container.querySelectorAll('button[data-item-id]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.itemId));
  });
}

function openModal(itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return;
  state.selectedItem = item;

  document.getElementById('modal-form-view').hidden = false;
  document.getElementById('modal-success-view').hidden = true;

  document.getElementById('modal-item-name').textContent = `Ofertar — ${item.name}`;
  const remaining = Math.max(0, item.target_amount - item.raised_amount);
  document.getElementById('modal-item-remaining').textContent = `Faltam ${currency(remaining)} para completar a meta.`;
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-error').hidden = true;

  const submitBtn = document.getElementById('modal-submit');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Registrar oferta e pagar via Pix';

  const chipValues = (state.siteContent && Array.isArray(state.siteContent.suggested_amounts) && state.siteContent.suggested_amounts.length)
    ? state.siteContent.suggested_amounts
    : [25.11, 50.11, 100.11, 250.11];
  const chipRow = document.getElementById('chip-row');
  chipRow.innerHTML = chipValues
    .map((v) => `<span class="chip" data-value="${v.toFixed(2)}">R$ ${v.toFixed(2).replace('.', ',')}</span>`)
    .join('');
  chipRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('modal-amount').value = chip.dataset.value;
      chipRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  document.getElementById('modal-backdrop').hidden = false;
}

function closeModal() {
  document.getElementById('modal-backdrop').hidden = true;
  state.selectedItem = null;
}

// "amount" é o valor exato que a pessoa registrou nessa oferta — o QR
// Code da tela de sucesso é gerado já com esse valor embutido (campo 54
// do BR Code), para reduzir o risco de alguém escanear e o banco permitir
// digitar um valor diferente do que foi registrado no site.
function showSuccessView(amount) {
  document.getElementById('modal-form-view').hidden = true;
  document.getElementById('modal-success-view').hidden = false;
  document.getElementById('copy-feedback').hidden = true;

  const hint = document.getElementById('modal-qr-amount-hint');
  if (typeof renderPixQrCode === 'function' && state.siteContent) {
    const pixKey = state.siteContent.pix_key || 'belavista@igrejaunited.com';
    const rendered = renderPixQrCode('pix-qr-modal', {
      key: pixKey,
      merchantName: state.siteContent.pix_merchant_name,
      merchantCity: state.siteContent.pix_merchant_city,
      amount,
    });
    if (rendered && amount) {
      hint.textContent = `Este QR Code já vem com o valor ${currency(amount)} preenchido — confira no app do seu banco antes de confirmar.`;
      hint.hidden = false;
    } else {
      hint.hidden = true;
    }
  } else if (hint) {
    hint.hidden = true;
  }
}

async function copyPixKey() {
  const feedback = document.getElementById('copy-feedback');
  const pixKey = (state.siteContent && state.siteContent.pix_key) || 'belavista@igrejaunited.com';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(pixKey);
    }
  } catch (err) {
    // clipboard indisponível neste navegador; a pessoa pode copiar a chave manualmente
  }
  feedback.hidden = false;
}

async function submitOffer() {
  const amountInput = document.getElementById('modal-amount');
  const nameInput = document.getElementById('modal-name');
  const errorEl = document.getElementById('modal-error');
  const submitBtn = document.getElementById('modal-submit');

  const amount = Number(amountInput.value);
  if (!amount || amount < 5) {
    errorEl.textContent = 'Informe um valor válido (mínimo R$ 5,00).';
    errorEl.hidden = false;
    return;
  }

  if (state.requirePayerName && !nameInput.value.trim()) {
    errorEl.textContent = 'Por favor, informe seu nome para registrar a oferta.';
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registrando…';

  try {
    const res = await fetch('/.netlify/functions/register-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: state.selectedItem.id,
        amount,
        payer_name: nameInput.value || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar oferta.');
    showSuccessView(amount);
  } catch (err) {
    errorEl.textContent = err.message || 'Não foi possível registrar a oferta. Tente novamente.';
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Registrar oferta e pagar via Pix';
  }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') closeModal();
});
document.getElementById('modal-submit').addEventListener('click', submitOffer);
document.getElementById('copy-pix-btn').addEventListener('click', copyPixKey);
document.getElementById('modal-done-btn').addEventListener('click', () => {
  closeModal();
  loadItems();
});

loadItems();
loadSiteContent();
