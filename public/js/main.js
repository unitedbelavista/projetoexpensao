const state = { items: [], selectedItem: null };
const PIX_KEY = 'belavista@igrejaunited.com';

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
  try {
    const res = await fetch('/.netlify/functions/site-content');
    if (!res.ok) return;
    const data = await res.json();
    if (data.hero_title) document.getElementById('hero-title').textContent = data.hero_title;
    if (data.hero_lead) document.getElementById('hero-lead').textContent = data.hero_lead;
    renderPillars(data.pillars_title, data.pillars);
  } catch (err) {
    // se falhar, a pagina mantem os textos padrao que ja estao no HTML
  }
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

  const chipValues = [25, 50, 100, 250];
  const chipRow = document.getElementById('chip-row');
  chipRow.innerHTML = chipValues.map((v) => `<span class="chip" data-value="${v}">R$ ${v}</span>`).join('');
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

function showSuccessView() {
  document.getElementById('modal-form-view').hidden = true;
  document.getElementById('modal-success-view').hidden = false;
  document.getElementById('copy-feedback').hidden = true;
}

async function copyPixKey() {
  const feedback = document.getElementById('copy-feedback');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(PIX_KEY);
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
    showSuccessView();
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
