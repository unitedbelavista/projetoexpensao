const state = { items: [], contributions: [] };
let pillarsState = [];

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function checkSession() {
  const res = await fetch('/.netlify/functions/admin-session');
  const data = await res.json();
  if (data.authenticated) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('dashboard').hidden = true;
}

function showDashboard() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  loadSummary();
  loadSiteContent();
}

async function login() {
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  try {
    const res = await fetch('/.netlify/functions/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Senha incorreta.');
    showDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

async function logout() {
  await fetch('/.netlify/functions/admin-logout', { method: 'POST' });
  showLogin();
}

async function loadSummary() {
  const res = await fetch('/.netlify/functions/admin-summary');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const data = await res.json();
  state.items = data.items || [];
  state.contributions = data.contributions || [];
  renderTotals(data.totals);
  renderItemsTable();
  renderContributionsTable();
}

function renderTotals(totals) {
  const row = document.getElementById('totals-row');
  const cards = [
    ['Meta total', totals.target],
    ['Arrecadado', totals.raised],
    ['Pendente', totals.pending],
    ['Ainda falta', totals.remaining],
  ];
  row.innerHTML = cards.map(([label, value]) => `
    <div class="total-card">
      <div class="label">${label}</div>
      <div class="value">${currency(value)}</div>
    </div>
  `).join('');
}

function renderItemsTable() {
  const container = document.getElementById('items-table');
  if (!state.items.length) {
    container.innerHTML = '<p>Nenhum item cadastrado ainda.</p>';
    return;
  }
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Item</th><th>Meta</th><th>Arrecadado</th><th>Pendente</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${state.items.map((item) => `
          <tr>
            <td>${item.name}</td>
            <td>${currency(item.target_amount)}</td>
            <td>${currency(item.raised_amount)}</td>
            <td>${currency(item.pending_amount)}</td>
            <td>${item.active ? 'Ativo' : 'Oculto'}</td>
            <td><button class="link-btn" data-edit="${item.id}">Editar</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.querySelectorAll('button[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openItemModal(btn.dataset.edit));
  });
}

function renderContributionsTable() {
  const container = document.getElementById('contributions-table');
  if (!state.contributions.length) {
    container.innerHTML = '<p>Nenhuma oferta registrada ainda.</p>';
    return;
  }
  const itemNameById = Object.fromEntries(state.items.map((i) => [i.id, i.name]));
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Data</th><th>Item</th><th>Ofertante</th><th>Valor</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${state.contributions.map((c) => `
          <tr>
            <td>${new Date(c.created_at).toLocaleString('pt-BR')}</td>
            <td>${itemNameById[c.item_id] || '—'}</td>
            <td>${c.payer_name || '—'}</td>
            <td>${currency(c.amount)}</td>
            <td><span class="status-pill status-${c.status}">${c.status}</span></td>
            <td>
              ${c.status === 'pending' ? `
                <button class="link-btn" data-approve="${c.id}">Confirmar recebimento</button>
                <button class="link-btn link-btn-danger" data-reject="${c.id}">Rejeitar</button>
              ` : '—'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.querySelectorAll('button[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => updateContributionStatus(btn.dataset.approve, 'approved'));
  });
  container.querySelectorAll('button[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => updateContributionStatus(btn.dataset.reject, 'rejected'));
  });
}

async function updateContributionStatus(id, status) {
  const label = status === 'approved' ? 'confirmar o recebimento desta oferta' : 'rejeitar esta oferta';
  if (!window.confirm(`Tem certeza que deseja ${label}? Confira antes se o Pix caiu mesmo na conta da igreja.`)) return;
  try {
    const res = await fetch('/.netlify/functions/admin-contributions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar oferta.');
    loadSummary();
  } catch (err) {
    window.alert(err.message);
  }
}

function openItemModal(itemId) {
  const item = itemId ? state.items.find((i) => i.id === itemId) : null;
  document.getElementById('item-modal-title').textContent = item ? 'Editar item' : 'Novo item';
  document.getElementById('item-id').value = item ? item.id : '';
  document.getElementById('item-name').value = item ? item.name : '';
  document.getElementById('item-description').value = item ? (item.description || '') : '';
  document.getElementById('item-image').value = item ? (item.image_url || '') : '';
  document.getElementById('item-image-file').value = '';
  document.getElementById('item-target').value = item ? item.target_amount : '';
  document.getElementById('item-active').checked = item ? item.active : true;
  document.getElementById('item-delete-btn').hidden = !item;
  document.getElementById('item-modal-error').hidden = true;

  const preview = document.getElementById('item-image-preview');
  if (item && item.image_url) {
    preview.src = item.image_url;
    preview.hidden = false;
  } else {
    preview.src = '';
    preview.hidden = true;
  }

  document.getElementById('item-modal-backdrop').hidden = false;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

async function handleImageFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const errorEl = document.getElementById('item-modal-error');
  const preview = document.getElementById('item-image-preview');
  errorEl.hidden = true;

  try {
    const dataBase64 = await fileToBase64(file);
    const res = await fetch('/.netlify/functions/admin-upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: file.type, data_base64: dataBase64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar imagem.');
    document.getElementById('item-image').value = data.image_url;
    preview.src = data.image_url;
    preview.hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

async function loadSiteContent() {
  try {
    const res = await fetch('/.netlify/functions/site-content');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('content-hero-title').value = data.hero_title || '';
    document.getElementById('content-hero-lead').value = data.hero_lead || '';
    document.getElementById('content-pillars-title').value = data.pillars_title || '';
    pillarsState = Array.isArray(data.pillars) ? data.pillars.map((p) => ({ ...p })) : [];
    renderPillarsEditor();
  } catch (err) {
    // se falhar, os campos ficam em branco e a pessoa pode preencher/tentar de novo
  }
}

function renderPillarsEditor() {
  const container = document.getElementById('pillars-editor');
  if (!pillarsState.length) {
    container.innerHTML = '<p class="field-hint">Nenhum pilar cadastrado ainda.</p>';
    return;
  }
  container.innerHTML = pillarsState.map((p, idx) => `
    <div class="pillar-block">
      <label>Pilar ${idx + 1} — título</label>
      <input type="text" class="pillar-title" data-idx="${idx}" value="${escapeHtml(p.title)}" />
      <label>Pilar ${idx + 1} — texto</label>
      <textarea class="pillar-text" data-idx="${idx}" rows="3">${escapeHtml(p.text)}</textarea>
      <button type="button" class="link-btn link-btn-danger pillar-remove" data-idx="${idx}">Remover pilar</button>
    </div>
  `).join('');

  container.querySelectorAll('.pillar-title').forEach((input) => {
    input.addEventListener('input', (e) => {
      pillarsState[Number(e.target.dataset.idx)].title = e.target.value;
    });
  });
  container.querySelectorAll('.pillar-text').forEach((textarea) => {
    textarea.addEventListener('input', (e) => {
      pillarsState[Number(e.target.dataset.idx)].text = e.target.value;
    });
  });
  container.querySelectorAll('.pillar-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      pillarsState.splice(Number(e.target.dataset.idx), 1);
      renderPillarsEditor();
    });
  });
}

function addPillar() {
  pillarsState.push({ title: '', text: '' });
  renderPillarsEditor();
}

async function saveSiteContent() {
  const errorEl = document.getElementById('content-error');
  const feedbackEl = document.getElementById('content-save-feedback');
  errorEl.hidden = true;
  feedbackEl.hidden = true;
  try {
    const res = await fetch('/.netlify/functions/admin-site-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_title: document.getElementById('content-hero-title').value.trim(),
        hero_lead: document.getElementById('content-hero-lead').value.trim(),
        pillars_title: document.getElementById('content-pillars-title').value.trim(),
        pillars: pillarsState.filter((p) => (p.title || '').trim() || (p.text || '').trim()),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar conteudo.');
    feedbackEl.hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

function closeItemModal() {
  document.getElementById('item-modal-backdrop').hidden = true;
}

async function saveItem() {
  const id = document.getElementById('item-id').value;
  const payload = {
    name: document.getElementById('item-name').value.trim(),
    description: document.getElementById('item-description').value.trim(),
    image_url: document.getElementById('item-image').value.trim(),
    target_amount: Number(document.getElementById('item-target').value),
    active: document.getElementById('item-active').checked,
  };
  const errorEl = document.getElementById('item-modal-error');

  if (!payload.name || !payload.target_amount) {
    errorEl.textContent = 'Nome e valor alvo são obrigatórios.';
    errorEl.hidden = false;
    return;
  }

  try {
    const res = await fetch('/.netlify/functions/admin-items', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar item.');
    closeItemModal();
    loadSummary();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

async function deleteItem() {
  const id = document.getElementById('item-id').value;
  if (!id) return;
  if (!window.confirm('Tem certeza que deseja excluir este item? As ofertas associadas também serão removidas.')) return;
  try {
    const res = await fetch(`/.netlify/functions/admin-items?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir item.');
    closeItemModal();
    loadSummary();
  } catch (err) {
    window.alert(err.message);
  }
}

document.getElementById('login-submit').addEventListener('click', login);
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('new-item-btn').addEventListener('click', () => openItemModal(null));
document.getElementById('item-modal-close').addEventListener('click', closeItemModal);
document.getElementById('item-save-btn').addEventListener('click', saveItem);
document.getElementById('item-delete-btn').addEventListener('click', deleteItem);
document.getElementById('item-image-file').addEventListener('change', handleImageFileChange);
document.getElementById('content-save-btn').addEventListener('click', saveSiteContent);
document.getElementById('pillar-add-btn').addEventListener('click', addPillar);

checkSession();
