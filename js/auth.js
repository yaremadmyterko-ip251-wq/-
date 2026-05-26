// ============================================================
//  auth.js — авторизація: вхід / реєстрація / вихід
// ============================================================

// ---------- Перемикання табів ----------
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('login-tab').classList.toggle('active', tab === 'login');
  document.getElementById('register-tab').classList.toggle('active', tab === 'register');
}

// ---------- Реєстрація ----------
function registerUser() {
  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const balance  = parseFloat(document.getElementById('reg-balance').value) || 0;
  const errEl    = document.getElementById('reg-error');

  errEl.textContent = '';

  if (!name || !username || !password) {
    errEl.textContent = 'Заповніть всі поля.';
    return;
  }
  if (username.length < 3) {
    errEl.textContent = 'Логін має бути не коротшим за 3 символи.';
    return;
  }
  if (password.length < 4) {
    errEl.textContent = 'Пароль має бути не коротшим за 4 символи.';
    return;
  }
  if (Storage.getUser(username)) {
    errEl.textContent = 'Такий логін вже зайнятий.';
    return;
  }

  const newUser = {
    name,
    username,
    password,
    balance,
    accounts: [
      { id: 'main', name: 'Основний', balance, color: '#2563eb' }
    ],
    transactions: balance > 0
      ? [createTransaction('income', balance, 'Початковий баланс', 'Інше')]
      : [],
    createdAt: Date.now(),
  };

  Storage.saveUser(newUser);
  Storage.setCurrentUsername(username);
  showDashboard();
}

// ---------- Вхід ----------
function loginUser() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Введіть логін та пароль.';
    return;
  }

  const user = Storage.getUser(username);
  if (!user || user.password !== password) {
    errEl.textContent = 'Невірний логін або пароль.';
    return;
  }

  Storage.setCurrentUsername(username);
  showDashboard();
}

// ---------- Вихід ----------
function logoutUser() {
  Storage.setCurrentUsername(null);
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
  // Очищаємо поля
  ['login-username', 'login-password'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('login-error').textContent = '';
}

// ---------- Оновити ім'я ----------
function updateName() {
  const newName = document.getElementById('new-name').value.trim();
  const msgEl   = document.getElementById('profile-msg');

  if (!newName) { msgEl.textContent = 'Введіть нове ім\'я.'; msgEl.className = 'error-msg'; return; }

  Storage.updateCurrentUser({ name: newName });
  msgEl.textContent = 'Ім\'я успішно змінено!';
  msgEl.className = 'success-msg';
  UI.renderProfile();
  UI.renderGreeting();
}

// ---------- Змінити пароль ----------
function updatePassword() {
  const oldPass = document.getElementById('old-password').value;
  const newPass = document.getElementById('new-password').value;
  const msgEl   = document.getElementById('profile-msg');
  const user    = Storage.getCurrentUser();

  if (user.password !== oldPass) {
    msgEl.textContent = 'Старий пароль невірний.';
    msgEl.className = 'error-msg';
    return;
  }
  if (newPass.length < 4) {
    msgEl.textContent = 'Новий пароль занадто короткий.';
    msgEl.className = 'error-msg';
    return;
  }

  Storage.updateCurrentUser({ password: newPass });
  msgEl.textContent = 'Пароль успішно змінено!';
  msgEl.className = 'success-msg';
  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
}

// ---------- Видалити акаунт ----------
function deleteAccount() {
  if (!confirm('Ви впевнені, що хочете видалити акаунт? Це незворотньо!')) return;
  const username = Storage.getCurrentUsername();
  Storage.deleteUser(username);
  logoutUser();
  showToast('Акаунт видалено.');
}