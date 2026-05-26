// ============================================================
//  storage.js — всі операції з localStorage
// ============================================================

const Storage = (() => {

  const KEYS = {
    USERS: 'ukrbank_users',
    CURRENT: 'ukrbank_current_user',
  };

  // ---------- Користувачі ----------

  function getUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  }

  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  function getUser(username) {
    return getUsers()[username] || null;
  }

  function saveUser(user) {
    const users = getUsers();
    users[user.username] = user;
    saveUsers(users);
  }

  function deleteUser(username) {
    const users = getUsers();
    delete users[username];
    saveUsers(users);
  }

  // ---------- Поточний сеанс ----------

  function getCurrentUsername() {
    return localStorage.getItem(KEYS.CURRENT) || null;
  }

  function setCurrentUsername(username) {
    if (username) {
      localStorage.setItem(KEYS.CURRENT, username);
    } else {
      localStorage.removeItem(KEYS.CURRENT);
    }
  }

  function getCurrentUser() {
    const username = getCurrentUsername();
    return username ? getUser(username) : null;
  }

  function updateCurrentUser(updatedFields) {
    const username = getCurrentUsername();
    if (!username) return false;
    const users = getUsers();
    if (!users[username]) return false;
    users[username] = { ...users[username], ...updatedFields };
    saveUsers(users);
    return true;
  }

  return {
    getUsers,
    saveUsers,
    getUser,
    saveUser,
    deleteUser,
    getCurrentUsername,
    setCurrentUsername,
    getCurrentUser,
    updateCurrentUser,
  };
})();