const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Дозволені домени (додайте ваші домени)
const ALLOWED_DOMAINS = [
'bankflow.com',
'www.bankflow.com',
'your-domain.com',
'www.your-domain.com',
'localhost' // тимчасово для розробки, видаліть після деплою
];

// Дозволені origin для CORS
const ALLOWED_ORIGINS = [
'https://bankflow.com',
'https://www.bankflow.com',
'https://your-domain.com',
'https://www.your-domain.com',
'http://localhost:3000' // тимчасово для розробки
];

// Middleware для перевірки домену
const checkDomain = (req, res, next) => {
const host = req.get('host');
const origin = req.get('origin');

// Отримуємо чистий домен без порту
let domain = host ? host.split(':')[0] : '';

// Перевіряємо чи домен дозволений
const isAllowed = ALLOWED_DOMAINS.some(allowed => {
return domain === allowed || domain.endsWith('.' + allowed);
});

// Якщо це API запит і домен не дозволений
if (req.path.startsWith('/api/') && !isAllowed && domain !== 'localhost') {
console.log(`❌ Заборонений доступ з домену: ${domain}`);
return res.status(403).json({
success: false,
message: 'Доступ заборонено. Використовуйте офіційний домен.'
});
}

next();
};

// CORS налаштування
const corsOptions = {
origin: function (origin, callback) {
// Дозволяємо запити без origin (як curl)
if (!origin) return callback(null, true);

if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || origin.includes('localhost')) {
callback(null, true);
} else {
console.log(`❌ CORS блокує origin: ${origin}`);
callback(new Error('Not allowed by CORS'));
}
},
credentials: true,
optionsSuccessStatus: 200
};

// Мідлвари
app.use(cors(corsOptions));
app.use(express.json());
app.use(checkDomain);

// Статичні файли тільки для дозволених доменів
app.use((req, res, next) => {
const host = req.get('host');
const domain = host ? host.split(':')[0] : '';

if (ALLOWED_DOMAINS.includes(domain) || domain === 'localhost') {
express.static('public')(req, res, next);
} else {
res.status(403).send(`
<!DOCTYPE html>
<html>
<head>
<title>Доступ заборонено</title>
<style>
body {
font-family: 'Inter', sans-serif;
background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
display: flex;
justify-content: center;
align-items: center;
height: 100vh;
margin: 0;
color: white;
}
.container {
text-align: center;
padding: 40px;
}
.lock-icon {
font-size: 80px;
margin-bottom: 20px;
}
h1 {
font-size: 48px;
margin-bottom: 16px;
}
p {
color: #94a3b8;
margin-bottom: 24px;
}
.domain {
background: rgba(59,130,246,0.2);
padding: 12px 24px;
border-radius: 12px;
display: inline-block;
font-family: monospace;
}
</style>
</head>
<body>
<div class="container">
<div class="lock-icon">🔒</div>
<h1>Доступ заборонено</h1>
<p>Цей сервіс доступний тільки через офіційний домен</p>
<div class="domain">bankflow.com</div>
</div>
</body>
</html>
`);
}
});

// Шляхи до файлів
const USERS_FILE = path.join(__dirname, 'users.json');
const TRANSFERS_FILE = path.join(__dirname, 'transfer.json');

// Функція для ініціалізації файлів
function initializeFiles() {
if (!fs.existsSync(USERS_FILE)) {
fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), 'utf8');
console.log('✅ Створено файл users.json');
}

if (!fs.existsSync(TRANSFERS_FILE)) {
const initialData = {
transfers: [],
balances: {},
contacts: {},
scheduledTransfers: [],
cards: {},
exchangeRates: {
USD: { UAH: 38.50, EUR: 0.92 },
EUR: { UAH: 41.80, USD: 1.09 },
UAH: { USD: 0.026, EUR: 0.024 },
lastUpdate: new Date().toISOString()
}
};
fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(initialData, null, 2), 'utf8');
console.log('✅ Створено файл transfer.json');
}
}

// Функції для роботи з файлами
function readUsers() {
try {
const data = fs.readFileSync(USERS_FILE, 'utf8');
return JSON.parse(data);
} catch (error) {
console.error('Помилка читання users.json:', error);
return {};
}
}

function writeUsers(users) {
try {
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
return true;
} catch (error) {
console.error('Помилка запису users.json:', error);
return false;
}
}

function readTransfers() {
try {
const data = fs.readFileSync(TRANSFERS_FILE, 'utf8');
return JSON.parse(data);
} catch (error) {
console.error('Помилка читання transfer.json:', error);
return {
transfers: [],
balances: {},
contacts: {},
scheduledTransfers: [],
cards: {},
exchangeRates: {
USD: { UAH: 38.50, EUR: 0.92 },
EUR: { UAH: 41.80, USD: 1.09 },
UAH: { USD: 0.026, EUR: 0.024 },
lastUpdate: new Date().toISOString()
}
};
}
}

function writeTransfers(data) {
try {
fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(data, null, 2), 'utf8');
return true;
} catch (error) {
console.error('Помилка запису transfer.json:', error);
return false;
}
}

// API: Реєстрація
app.post('/api/register', async (req, res) => {
console.log('📝 Отримано запит на реєстрацію');

const { username, email, password } = req.body;

if (!username || !email || !password) {
return res.status(400).json({
success: false,
message: 'Будь ласка, заповніть всі поля'
});
}

if (password.length < 6) {
return res.status(400).json({
success: false,
message: 'Пароль повинен містити мінімум 6 символів'
});
}

try {
const users = readUsers();

if (users[username]) {
return res.status(400).json({
success: false,
message: 'Користувач з таким іменем вже існує'
});
}

const emailExists = Object.values(users).some(user => user.email === email);
if (emailExists) {
return res.status(400).json({
success: false,
message: 'Користувач з таким email вже існує'
});
}

const hashedPassword = await bcrypt.hash(password, 10);

users[username] = {
username,
email,
password: hashedPassword,
createdAt: new Date().toISOString()
};

if (writeUsers(users)) {
const transfersData = readTransfers();

if (!transfersData.balances[username]) {
transfersData.balances[username] = {
UAH: 10000.00,
USD: 0,
EUR: 0
};
}

if (!transfersData.contacts[username]) {
transfersData.contacts[username] = [];
}

if (!transfersData.cards[username]) {
const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
const last4 = (hash % 9000 + 1000).toString();
transfersData.cards[username] = [{
cardId: `CARD${Date.now()}`,
cardNumber: `**** **** **** ${last4}`,
cardType: 'visa',
expiryDate: '12/28',
cvv: '***',
balance: 10000.00,
currency: 'UAH',
status: 'active',
isMain: true
}];
}

writeTransfers(transfersData);

res.json({
success: true,
message: 'Реєстрація успішна! Тепер ви можете увійти.'
});
} else {
res.status(500).json({
success: false,
message: 'Помилка при збереженні даних'
});
}
} catch (error) {
console.error('❌ Помилка реєстрації:', error);
res.status(500).json({
success: false,
message: 'Внутрішня помилка сервера'
});
}
});

// API: Логін
app.post('/api/login', async (req, res) => {
const { username, password } = req.body;

if (!username || !password) {
return res.status(400).json({
success: false,
message: 'Будь ласка, заповніть всі поля'
});
}

try {
const users = readUsers();
const user = users[username];

if (!user) {
return res.status(401).json({
success: false,
message: 'Невірне ім\'я користувача або пароль'
});
}

const isValid = await bcrypt.compare(password, user.password);

if (isValid) {
const transfersData = readTransfers();

res.json({
success: true,
message: 'Вхід виконано успішно!',
user: {
username: user.username,
email: user.email,
createdAt: user.createdAt
},
balance: transfersData.balances[username] || { UAH: 0, USD: 0, EUR: 0 }
});
} else {
res.status(401).json({
success: false,
message: 'Невірне ім\'я користувача або пароль'
});
}
} catch (error) {
console.error('❌ Помилка логіну:', error);
res.status(500).json({
success: false,
message: 'Внутрішня помилка сервера'
});
}
});

// API: Отримання балансу
app.get('/api/balance/:username', (req, res) => {
const { username } = req.params;
const transfersData = readTransfers();

if (transfersData.balances[username]) {
res.json({
success: true,
balance: transfersData.balances[username]
});
} else {
res.status(404).json({
success: false,
message: 'Користувача не знайдено'
});
}
});

// API: Отримання історії транзакцій
app.get('/api/transactions/:username', (req, res) => {
const { username } = req.params;
const transfersData = readTransfers();

const userTransactions = transfersData.transfers.filter(
t => t.from === username || t.to === username
).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

res.json({
success: true,
transactions: userTransactions
});
});

// API: Виконання переказу
app.post('/api/transfer', async (req, res) => {
const { fromUser, toUser, amount, currency, description } = req.body;

if (!fromUser || !toUser || !amount || !currency) {
return res.status(400).json({
success: false,
message: 'Будь ласка, заповніть всі поля'
});
}

if (amount <= 0) {
return res.status(400).json({
success: false,
message: 'Сума повинна бути більше 0'
});
}

try {
const transfersData = readTransfers();
const users = readUsers();

if (!users[fromUser]) {
return res.status(404).json({
success: false,
message: 'Відправника не знайдено'
});
}

if (!users[toUser]) {
return res.status(404).json({
success: false,
message: 'Отримувача не знайдено'
});
}

const fromBalance = transfersData.balances[fromUser]?.[currency] || 0;
if (fromBalance < amount) {
return res.status(400).json({
success: false,
message: `Недостатньо коштів. Доступно: ${fromBalance} ${currency}`
});
}

if (!transfersData.balances[fromUser]) transfersData.balances[fromUser] = {};
if (!transfersData.balances[toUser]) transfersData.balances[toUser] = {};

transfersData.balances[fromUser][currency] = (transfersData.balances[fromUser][currency] || 0) - amount;
transfersData.balances[toUser][currency] = (transfersData.balances[toUser][currency] || 0) + amount;

const transfer = {
id: `TRF${Date.now()}`,
from: fromUser,
to: toUser,
amount: parseFloat(amount),
currency,
status: 'completed',
type: 'instant',
description: description || 'Переказ коштів',
createdAt: new Date().toISOString(),
completedAt: new Date().toISOString()
};

transfersData.transfers.push(transfer);

if (!transfersData.contacts[fromUser]) transfersData.contacts[fromUser] = [];

const existingContact = transfersData.contacts[fromUser].find(c => c.username === toUser);
if (existingContact) {
existingContact.lastTransfer = new Date().toISOString();
} else {
transfersData.contacts[fromUser].push({
name: toUser,
username: toUser,
phone: '',
favorite: false,
lastTransfer: new Date().toISOString()
});
}

writeTransfers(transfersData);

res.json({
success: true,
message: 'Переказ успішно виконано',
transfer,
newBalance: transfersData.balances[fromUser][currency]
});

} catch (error) {
console.error('Помилка переказу:', error);
res.status(500).json({
success: false,
message: 'Внутрішня помилка сервера'
});
}
});

// API: Отримання контактів
app.get('/api/contacts/:username', (req, res) => {
const { username } = req.params;
const transfersData = readTransfers();

const contacts = transfersData.contacts[username] || [];
res.json({
success: true,
contacts
});
});

// Ініціалізація та запуск
initializeFiles();

app.listen(PORT, '0.0.0.0', () => {
console.log('\n=================================');
console.log('🚀 BankFlow сервер запущено!');
console.log(`📍 Доступ за адресами:`);
console.log(` - https://bankflow.com (основний домен)`);
console.log(` - https://www.bankflow.com`);
console.log(` - http://localhost:${PORT} (тільки для розробки)`);
console.log('=================================\n');
console.log('🔒 Захист домену активовано');
console.log(`✅ Дозволені домени: ${ALLOWED_DOMAINS.join(', ')}`);
console.log('=================================\n');
});

