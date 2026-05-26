// ============================================================
//  transactions.js — поповнення, зняття, переказ, фільтрація
// ============================================================

// ---------- Хелпер: створити об'єкт транзакції ----------
function createTransaction(type, amount, description, category) {
  return {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    type,       // 'income' | 'expense' | 'transfer'
    amount: Math.abs(amount),
    description: description || '—',
    category: category || 'Інше',
    date: Date.now(),
  };
}

// ---------- Додати транзакцію до поточного юзера ----------
function addTransaction(tx) {
  const user = Storage.getCurrentUser();
  user.transactions = user.transactions || [];
  user.transactions.unshift(tx);
  Storage.saveUser(user);
}

// ---------- Поповнення ----------
function doDeposit() {
  const amount   = parseFloat(document.getElementById('deposit-amount').value);
  const category = document.getElementById('deposit-category').value;
  const desc     = document.getElementById('deposit-desc').value.trim() || 'Поповнення';
  const errEl    = document.getElementById('deposit-error');

  errEl.textContent = '';

  if (!amount || amount <= 0) {
    errEl.textContent = 'Введіть суму більше 0.';
    return;
  }

  const user = Storage.getCurrentUser();
  user.balance = (user.balance || 0) + amount;
  // Синхронізуємо основний рахунок
  if (user.accounts && user.accounts[0]) user.accounts[0].balance += amount;

  const tx = createTransaction('income', amount, desc, category);
  user.transactions = user.transactions || [];
  user.transactions.unshift(tx);
  Storage.saveUser(user);

  closeAllModals();
  showToast(`Поповнено на ₴${amount.toFixed(2)}`);
  UI.refreshAll();
}

// ---------- Зняття ----------
function doWithdraw() {
  const amount   = parseFloat(document.getElementById('withdraw-amount').value);
  const category = document.getElementById('withdraw-category').value;
  const desc     = document.getElementById('withdraw-desc').value.trim() || 'Зняття';
  const errEl    = document.getElementById('withdraw-error');

  errEl.textContent = '';

  if (!amount || amount <= 0) {
    errEl.textContent = 'Введіть суму більше 0.';
    return;
  }

  const user = Storage.getCurrentUser();
  if (amount > (user.balance || 0)) {
    errEl.textContent = 'Недостатньо коштів.';
    return;
  }

  user.balance -= amount;
  if (user.accounts && user.accounts[0]) user.accounts[0].balance -= amount;

  const tx = createTransaction('expense', amount, desc, category);
  user.transactions = user.transactions || [];
  user.transactions.unshift(tx);
  Storage.saveUser(user);

  closeAllModals();
  showToast(`Знято ₴${amount.toFixed(2)}`);
  UI.refreshAll();
}

// ---------- Переказ ----------
function doTransfer() {
  const toUsername = document.getElementById('transfer-to').value.trim();
  const amount     = parseFloat(document.getElementById('transfer-amount').value);
  const desc       = document.getElementById('transfer-desc').value.trim() || 'Переказ';
  const errEl      = document.getElementById('transfer-error');
  const successEl  = document.getElementById('transfer-success');

  errEl.textContent = '';
  successEl.textContent = '';

  const sender = Storage.getCurrentUser();

  if (!toUsername) { errEl.textContent = 'Введіть логін отримувача.'; return; }
  if (toUsername === sender.username) { errEl.textContent = 'Не можна переказати самому собі.'; return; }
  if (!amount || amount <= 0) { errEl.textContent = 'Введіть суму більше 0.'; return; }
  if (amount > (sender.balance || 0)) { errEl.textContent = 'Недостатньо коштів.'; return; }

  const receiver = Storage.getUser(toUsername);
  if (!receiver) { errEl.textContent = 'Користувача не знайдено.'; return; }

  // Списуємо у відправника
  sender.balance -= amount;
  if (sender.accounts && sender.accounts[0]) sender.accounts[0].balance -= amount;
  const txOut = createTransaction('transfer', amount, `Переказ → ${toUsername}: ${desc}`, 'Переказ');
  txOut.type = 'transfer'; txOut.direction = 'out';
  sender.transactions = sender.transactions || [];
  sender.transactions.unshift(txOut);
  Storage.saveUser(sender);

  // Зараховуємо отримувачу
  receiver.balance = (receiver.balance || 0) + amount;
  if (receiver.accounts && receiver.accounts[0]) receiver.accounts[0].balance += amount;
  const txIn = createTransaction('transfer', amount, `Переказ ← ${sender.username}: ${desc}`, 'Переказ');
  txIn.type = 'transfer'; txIn.direction = 'in';
  receiver.transactions = receiver.transactions || [];
  receiver.transactions.unshift(txIn);
  Storage.saveUser(receiver);

  document.getElementById('transfer-to').value = '';
  document.getElementById('transfer-amount').value = '';
  document.getElementById('transfer-desc').value = '';

  successEl.textContent = `Переказано ₴${amount.toFixed(2)} користувачу ${receiver.name}!`;
  showToast(`✅ Переказ успішний!`);
  UI.refreshAll();
}

// ---------- Фільтрація транзакцій ----------
function filterTransactions() {
  const type     = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const search   = document.getElementById('filter-search').value.toLowerCase();
  const user     = Storage.getCurrentUser();
  const txs      = user.transactions || [];

  const filtered = txs.filter(tx => {
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    if (search && !tx.description.toLowerCase().includes(search)) return false;
    return true;
  });

  UI.renderTransactionsList(document.getElementById('all-transactions'), filtered);
}

// ---------- Отримати суми надходжень / витрат ----------
function calcTotals(transactions) {
  let income = 0, expenses = 0;
  (transactions || []).forEach(tx => {
    if (tx.type === 'income' || (tx.type === 'transfer' && tx.direction === 'in')) {
      income += tx.amount;
    } else if (tx.type === 'expense' || (tx.type === 'transfer' && tx.direction === 'out')) {
      expenses += tx.amount;
    }
  });
  return { income, expenses };
}