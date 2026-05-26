// ============================================================
//  ui.js — рендеринг: картки, транзакції, статистика, графіки
// ============================================================

const UI = (() => {

  // ---------- Загальне оновлення ----------
  function refreshAll() {
    const user = Storage.getCurrentUser();
    if (!user) return;

    renderGreeting();
    renderBalance(user);
    renderRecentTransactions(user);
    renderAllTransactions(user);
    renderAccounts(user);
    renderStatistics(user);
    renderProfile(user);
    renderMobileBalance(user);
  }

  // ---------- Привітання ----------
  function renderGreeting() {
    const user = Storage.getCurrentUser();
    if (!user) return;
    const h = new Date().getHours();
    const greet = h < 12 ? 'Доброго ранку' : h < 17 ? 'Добрий день' : 'Добрий вечір';
    const el = document.getElementById('greeting');
    if (el) el.textContent = `${greet}, ${user.name}!`;

    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('uk-UA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  // ---------- Баланс ----------
  function renderBalance(user) {
    const bal = user.balance || 0;
    setText('total-balance', formatMoney(bal));
    setMobileBalance(bal);

    const { income, expenses } = calcTotals(user.transactions);
    setText('total-income',   formatMoney(income));
    setText('total-expenses', formatMoney(expenses));

    const changeEl = document.getElementById('balance-change');
    if (changeEl) {
      const diff = income - expenses;
      changeEl.textContent = (diff >= 0 ? '+' : '') + formatMoney(diff) + ' за весь час';
      changeEl.style.color = diff >= 0 ? '#4ade80' : '#f87171';
    }
  }

  function renderMobileBalance(user) {
    const el = document.getElementById('mobile-balance');
    if (el) el.textContent = formatMoney(user.balance || 0);
  }

  // ---------- Останні транзакції (на огляді) ----------
  function renderRecentTransactions(user) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    const recent = (user.transactions || []).slice(0, 5);
    renderTransactionsList(container, recent);
  }

  // ---------- Всі транзакції ----------
  function renderAllTransactions(user) {
    const container = document.getElementById('all-transactions');
    if (!container) return;
    renderTransactionsList(container, user.transactions || []);
  }

  // ---------- Рендер списку транзакцій ----------
  function renderTransactionsList(container, txs) {
    if (!container) return;
    if (!txs.length) {
      container.innerHTML = '<p class="empty-state">Транзакцій немає</p>';
      return;
    }
    container.innerHTML = txs.map(tx => {
      const isPositive = tx.type === 'income' || tx.direction === 'in';
      const sign   = isPositive ? '+' : '-';
      const cls    = isPositive ? 'tx-positive' : 'tx-negative';
      const icon   = txIcon(tx);
      const date   = new Date(tx.date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
      return `
        <div class="tx-item">
          <div class="tx-icon">${icon}</div>
          <div class="tx-details">
            <div class="tx-desc">${escHtml(tx.description)}</div>
            <div class="tx-meta">${escHtml(tx.category)} · ${date}</div>
          </div>
          <div class="tx-amount ${cls}">${sign}${formatMoney(tx.amount)}</div>
        </div>`;
    }).join('');
  }

  // ---------- Рахунки ----------
  function renderAccounts(user) {
    const container = document.getElementById('accounts-list');
    if (!container) return;
    const accounts = user.accounts || [];
    if (!accounts.length) {
      container.innerHTML = '<p class="empty-state">Рахунків немає</p>';
      return;
    }
    container.innerHTML = accounts.map(acc => `
      <div class="account-card" style="border-top: 4px solid ${acc.color || '#2563eb'}">
        <div class="acc-name">${escHtml(acc.name)}</div>
        <div class="acc-balance">${formatMoney(acc.balance || 0)}</div>
      </div>`).join('');
  }

  // ---------- Статистика ----------
  function renderStatistics(user) {
    const txs = user.transactions || [];
    const { income, expenses } = calcTotals(txs);
    const expenseTxs = txs.filter(tx => tx.type === 'expense' || tx.direction === 'out');
    const incomeTxs  = txs.filter(tx => tx.type === 'income'  || tx.direction === 'in');

    setText('stat-total-tx', txs.length);
    setText('stat-avg-exp', expenseTxs.length
      ? formatMoney(expenseTxs.reduce((s, t) => s + t.amount, 0) / expenseTxs.length)
      : '₴0');
    setText('stat-max-inc', incomeTxs.length
      ? formatMoney(Math.max(...incomeTxs.map(t => t.amount)))
      : '₴0');
    setText('stat-max-exp', expenseTxs.length
      ? formatMoney(Math.max(...expenseTxs.map(t => t.amount)))
      : '₴0');

    renderCategoryChart(expenseTxs);
    renderBalanceChart(user);
  }

  // ---------- Кругова діаграма категорій ----------
  function renderCategoryChart(expenseTxs) {
    const container = document.getElementById('category-chart');
    if (!container) return;

    const map = {};
    expenseTxs.forEach(tx => {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#db2777'];

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
      container.innerHTML = '<p class="empty-state">Немає витрат</p>';
      return;
    }

    container.innerHTML = entries.map(([cat, val], i) => {
      const pct = ((val / total) * 100).toFixed(1);
      const color = colors[i % colors.length];
      return `
        <div class="cat-row">
          <div class="cat-dot" style="background:${color}"></div>
          <div class="cat-name">${escHtml(cat)}</div>
          <div class="cat-bar-wrap">
            <div class="cat-bar" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="cat-pct">${pct}%</div>
          <div class="cat-val">${formatMoney(val)}</div>
        </div>`;
    }).join('');
  }

  // ---------- Міні-лінійний графік балансу по днях ----------
  function renderBalanceChart(user) {
    const container = document.getElementById('balance-chart');
    if (!container) return;

    const txs = [...(user.transactions || [])].reverse(); // хронологічний порядок
    if (!txs.length) { container.innerHTML = '<p class="empty-state">Немає даних</p>'; return; }

    // Агрегуємо баланс по днях
    const dayMap = {};
    let running = 0;
    txs.forEach(tx => {
      const day = new Date(tx.date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' });
      const delta = (tx.type === 'income' || tx.direction === 'in')
        ? tx.amount
        : -tx.amount;
      running += delta;
      dayMap[day] = running;
    });

    const entries = Object.entries(dayMap).slice(-14); // останні 14 днів
    const vals    = entries.map(e => e[1]);
    const min     = Math.min(...vals);
    const max     = Math.max(...vals);
    const range   = max - min || 1;

    const W = 600, H = 160, PAD = 20;
    const pts = entries.map(([, v], i) => {
      const x = PAD + (i / (entries.length - 1 || 1)) * (W - PAD * 2);
      const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
      return `${x},${y}`;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="balance-svg">
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#2563eb" stroke-width="2.5"
          stroke-linejoin="round" stroke-linecap="round"
          points="${pts.join(' ')}"/>
        <polyline fill="url(#balGrad)" stroke="none"
          points="${pts[0].split(',')[0]},${H} ${pts.join(' ')} ${pts[pts.length-1].split(',')[0]},${H}"/>
        ${entries.map(([label], i) => {
          const x = PAD + (i / (entries.length - 1 || 1)) * (W - PAD * 2);
          return i % 2 === 0
            ? `<text x="${x}" y="${H - 2}" text-anchor="middle" font-size="9" fill="var(--text-muted, #888)">${label}</text>`
            : '';
        }).join('')}
      </svg>`;
  }

  // ---------- Профіль ----------
  function renderProfile() {
    const user = Storage.getCurrentUser();
    if (!user) return;
    setText('profile-name', user.name);
    setText('profile-username', '@' + user.username);
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  }

  // ---------- Допоміжні ----------
  function formatMoney(n) {
    return '₴' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function setMobileBalance(bal) {
    const el = document.getElementById('mobile-balance');
    if (el) el.textContent = formatMoney(bal);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function txIcon(tx) {
    const icons = {
      'Зарплата': '💼', 'Їжа': '🍔', 'Транспорт': '🚌',
      'Розваги': '🎮', 'Комунальні': '🏠', 'Одяг': '👕',
      'Подарунок': '🎁', 'Фріланс': '💻', 'Переказ': '↔️', 'Інше': '💰',
    };
    if (tx.type === 'transfer') return '↔️';
    return icons[tx.category] || '💰';
  }

  return {
    refreshAll,
    renderGreeting,
    renderTransactionsList,
    renderProfile,
    formatMoney,
  };
})();