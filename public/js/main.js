const state = { items: [], selectedItem: null };

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

  document.getElementById('modal-item-name').textContent = `Ofertar — ${item.name}`;
  const remaining = Math.max(0, item.target_amount - item.raised_amount);
  document.getElementById('modal-item-remaining').textContent = `Faltam ${currency(remaining)} para completar a meta.`;
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-error').hidden = true;

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
  submitBtn.textContent = 'Preparando pagamento via Pix…';

  try {
    const res = await fetch('/.netlify/functions/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: state.selectedItem.id,
        amount,
        payer_name: nameInput.value || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar pagamento.');
    window.location.href = data.checkout_url;
  } catch (err) {
    errorEl.textContent = err.message || 'Não foi possível iniciar o pagamento. Tente novamente.';
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ir para pagamento via Pix';
  }
}

function showStatusBanner() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (!status) return;
  const banner = document.getElementById('status-banner');
  const messages = {
    sucesso: 'Oferta recebida! Muito obrigado por fazer parte deste projeto. 🙏',
    pendente: 'Sua oferta está sendo processada. Assim que for confirmada, o progresso será atualizado.',
    falha: 'Não foi possível concluir o pagamento. Você pode tentar novamente quando quiser.',
  };
  if (messages[status]) {
    banner.textContent = messages[status];
    banner.hidden = false;
  }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') closeModal();
});
document.getElementById('modal-submit').addEventListener('click', submitOffer);

showStatusBanner();
loadItems();
