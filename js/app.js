// ============================================================
//  app.js — ініціалізація застосунку, навігація, модалки, toast
// ============================================================

// ---------- Показати dashboard ----------
function showDashboard() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  showPage('overview');
  UI.refreshAll();
}

// ---------- Навігація між сторінками ----------
function showPage(pageId) {
  // Сторінки
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  // Кнопки в сайдбарі
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + pageId);
  if (navBtn) navBtn.classList.add('active');

  // Закрити мобільне меню
  document.getElementById('sidebar').classList.remove('open');

  // Перефільтрувати транзакції при переході на сторінку
  if (pageId === 'transactions') filterTransactions();
}

// ---------- Мобільне меню ----------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ---------- Модальні вікна ----------
function openModal(modalId) {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById(modalId).classList.add('active');
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  // Очистити поля та помилки
  document.querySelectorAll('.modal input').forEach(i => i.value = '');
  document.querySelectorAll('.modal .error-msg').forEach(e => e.textContent = '');
}

// ---------- Вибір кольору (при створенні рахунку) ----------
function selectColor(el) {
  document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function getSelectedColor() {
  const selected = document.querySelector('.color-option.selected');
  return selected ? selected.dataset.color : '#2563eb';
}

// ---------- Додати новий рахунок ----------
function addAccount() {
  const name    = document.getElementById('new-account-name').value.trim();
  const balance = parseFloat(document.getElementById('new-account-balance').value) || 0;
  const color   = getSelectedColor();

  if (!name) { showToast('Введіть назву рахунку.'); return; }

  const user = Storage.getCurrentUser();
  user.accounts = user.accounts || [];
  user.accounts.push({
    id: 'acc_' + Date.now(),
    name,
    balance,
    color,
  });
  user.balance = (user.balance || 0) + balance;

  if (balance > 0) {
    const tx = createTransaction('income', balance, `Початковий баланс (${name})`, 'Інше');
    user.transactions = user.transactions || [];
    user.transactions.unshift(tx);
  }

  Storage.saveUser(user);
  closeAllModals();
  showToast(`Рахунок "${name}" додано!`);
  UI.refreshAll();
}

// ---------- Toast-повідомлення ----------
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

// ---------- Ініціалізація при завантаженні ----------
document.addEventListener('DOMContentLoaded', () => {
  const user = Storage.getCurrentUser();
  if (user) {
    showDashboard();
  } else {
    document.getElementById('auth-screen').classList.add('active');
  }

  // Закрити сайдбар при кліку поза ним на мобільному
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const burger  = document.querySelector('.burger');
    if (
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== burger
    ) {
      sidebar.classList.remove('open');
    }
  });
});