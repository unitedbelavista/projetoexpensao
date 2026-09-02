const state = { items: [], contributions: [] };

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        <tr><th>Data</th><th>Item</th><th>Ofertante</th><th>Valor</th><th>Status</th><th>Método</th></tr>
      </thead>
      <tbody>
        ${state.contributions.map((c) => `
          <tr>
            <td>${new Date(c.created_at).toLocaleString('pt-BR')}</td>
            <td>${itemNameById[c.item_id] || '—'}</td>
            <td>${c.payer_name || '—'}</td>
            <td>${currency(c.amount)}</td>
            <td><span class="status-pill status-${c.status}">${c.status}</span></td>
            <td>${c.payment_method || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function openItemModal(itemId) {
  const item = itemId ? state.items.find((i) => i.id === itemId) : null;
  document.getElementById('item-modal-title').textContent = item ? 'Editar item' : 'Novo item';
  document.getElementById('item-id').value = item ? item.id : '';
  document.getElementById('item-name').value = item ? item.name : '';
  document.getElementById('item-description').value = item ? (item.description || '') : '';
  document.getElementById('item-image').value = item ? (item.image_url || '') : '';
  document.getElementById('item-target').value = item ? item.target_amount : '';
  document.getElementById('item-active').checked = item ? item.active : true;
  document.getElementById('item-delete-btn').hidden = !item;
  document.getElementById('item-modal-error').hidden = true;
  document.getElementById('item-modal-backdrop').hidden = false;
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

checkSession();
