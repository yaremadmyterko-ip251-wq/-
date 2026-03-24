const STORAGE_KEY = "trustbank_data_v1";
const SESSION_KEY = "trustbank_session_v1";

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const transferForm = document.getElementById("transferForm");
const logoutBtn = document.getElementById("logoutBtn");
const topupBtn = document.getElementById("topupBtn");
const messageEl = document.getElementById("message");

const ownerName = document.getElementById("ownerName");
const accountNumber = document.getElementById("accountNumber");
const balanceEl = document.getElementById("balance");
const historyEl = document.getElementById("history");

const state = {
  db: readDB(),
  currentUserId: localStorage.getItem(SESSION_KEY),
};

function readDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { users: [], transactions: [] };

  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], transactions: [] };
  }
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function createAccountNumber() {
  const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
  return `UA${digits}`;
}

function getCurrentUser() {
  return state.db.users.find((u) => u.id === state.currentUserId);
}

function saveSession() {
  if (state.currentUserId) {
    localStorage.setItem(SESSION_KEY, state.currentUserId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function render() {
  const user = getCurrentUser();
  const isAuthed = Boolean(user);

  authSection.classList.toggle("hidden", isAuthed);
  dashboard.classList.toggle("hidden", !isAuthed);
  logoutBtn.classList.toggle("hidden", !isAuthed);

  if (!isAuthed) return;

  ownerName.textContent = user.fullName;
  accountNumber.textContent = user.accountNumber;
  balanceEl.textContent = formatMoney(user.balance);

  const myTransactions = state.db.transactions
    .filter((tx) => tx.fromUserId === user.id || tx.toUserId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  historyEl.innerHTML = "";

  if (myTransactions.length === 0) {
    historyEl.innerHTML = "<li class='muted'>Транзакцій поки немає.</li>";
    return;
  }

  myTransactions.forEach((tx) => {
    const isIncome = tx.toUserId === user.id;
    const counterparty = state.db.users.find((u) => u.id === (isIncome ? tx.fromUserId : tx.toUserId));

    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <div><strong>${isIncome ? "Вхідний" : "Вихідний"} переказ</strong></div>
      <div>${counterparty ? counterparty.fullName : "Невідомий користувач"} (${counterparty?.email ?? "—"})</div>
      <div class="amount ${isIncome ? "in" : "out"}">${isIncome ? "+" : "-"}${formatMoney(tx.amount)} ₴</div>
      <small class="muted">${new Date(tx.createdAt).toLocaleString("uk-UA")} ${tx.note ? `• ${tx.note}` : ""}</small>
    `;

    historyEl.appendChild(li);
  });
}

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(registerForm);
  const fullName = form.get("fullName").toString().trim();
  const email = normalizeEmail(form.get("email").toString());
  const password = form.get("password").toString();

  if (state.db.users.some((u) => u.email === email)) {
    return showMessage("Користувач з таким email вже існує.", true);
  }

  const user = {
    id: crypto.randomUUID(),
    fullName,
    email,
    password,
    accountNumber: createAccountNumber(),
    balance: 5000,
    createdAt: new Date().toISOString(),
  };

  state.db.users.push(user);
  saveDB();
  showMessage("Рахунок створено. Тепер виконайте вхід.");
  registerForm.reset();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  const email = normalizeEmail(form.get("email").toString());
  const password = form.get("password").toString();

  const user = state.db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return showMessage("Невірний email або пароль.", true);
  }

  state.currentUserId = user.id;
  saveSession();
  showMessage(`Вітаємо, ${user.fullName}!`);
  loginForm.reset();
  render();
});

logoutBtn.addEventListener("click", () => {
  state.currentUserId = null;
  saveSession();
  showMessage("Ви вийшли з акаунту.");
  render();
});

topupBtn.addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) return;

  user.balance += 1000;
  state.db.transactions.push({
    id: crypto.randomUUID(),
    fromUserId: user.id,
    toUserId: user.id,
    amount: 1000,
    note: "Демо-поповнення",
    createdAt: new Date().toISOString(),
  });

  saveDB();
  showMessage("Баланс поповнено на 1000 ₴.");
  render();
});

transferForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const sender = getCurrentUser();
  if (!sender) return;

  const form = new FormData(transferForm);
  const toEmail = normalizeEmail(form.get("toEmail").toString());
  const note = form.get("note").toString().trim();
  const amount = Number(form.get("amount"));

  if (!Number.isFinite(amount) || amount <= 0) {
    return showMessage("Вкажіть коректну суму переказу.", true);
  }

  if (sender.email === toEmail) {
    return showMessage("Неможливо переказати кошти на власний рахунок.", true);
  }

  const receiver = state.db.users.find((u) => u.email === toEmail);
  if (!receiver) {
    return showMessage("Отримувача не знайдено.", true);
  }

  if (sender.balance < amount) {
    return showMessage("Недостатньо коштів на рахунку.", true);
  }

  sender.balance -= amount;
  receiver.balance += amount;

  state.db.transactions.push({
    id: crypto.randomUUID(),
    fromUserId: sender.id,
    toUserId: receiver.id,
    amount,
    note,
    createdAt: new Date().toISOString(),
  });

  saveDB();
  transferForm.reset();
  showMessage(`Переказ ${formatMoney(amount)} ₴ виконано успішно.`);
  render();
});

render();
