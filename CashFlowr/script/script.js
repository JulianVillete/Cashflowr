// Authentication System
let currentUser = null;
let users = JSON.parse(localStorage.getItem('cashflowr-users')) || {};

// Authentication Functions
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function hashPassword(password) {
  // Simple hash function for demo purposes
  // In production, use proper hashing like bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function getInitials(name) {
  return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function showAuthError(message) {
  showNotification(message, 'error');
}

function showAuthSuccess(message) {
  showNotification(message, 'success');
}

// Signup Function
function signup(name, email, password) {
  if (!name.trim() || !email.trim() || !password.trim()) {
    showAuthError('Please fill in all fields');
    return false;
  }

  if (!validateEmail(email)) {
    showAuthError('Please enter a valid email address');
    return false;
  }

  if (!validatePassword(password)) {
    showAuthError('Password must be at least 6 characters long');
    return false;
  }

  if (users[email]) {
    showAuthError('An account with this email already exists');
    return false;
  }

  const userId = generateUserId();
  const hashedPassword = hashPassword(password);
  
  users[email] = {
    id: userId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  localStorage.setItem('cashflowr-users', JSON.stringify(users));
  showAuthSuccess('Account created successfully!');
  return true;
}

// Login Function
function login(email, password) {
  if (!email.trim() || !password.trim()) {
    showAuthError('Please fill in all fields');
    return false;
  }

  const user = users[email.toLowerCase().trim()];
  if (!user) {
    showAuthError('Invalid email or password');
    return false;
  }

  const hashedPassword = hashPassword(password);
  if (user.password !== hashedPassword) {
    showAuthError('Invalid email or password');
    return false;
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  users[email.toLowerCase().trim()] = user;
  localStorage.setItem('cashflowr-users', JSON.stringify(users));

  currentUser = user;
  localStorage.setItem('cashflowr-current-user', JSON.stringify(currentUser));
  
  showAuthSuccess(`Welcome back, ${user.name}!`);
  return true;
}

// Logout Function
function logout() {
  currentUser = null;
  localStorage.removeItem('cashflowr-current-user');
  
  // Clear user-specific data
  transactions = [];
  savingsGoal = 0;
  
  showAuthSuccess('Logged out successfully');
  showAuthModal();
}

// Check if user is logged in
function checkAuth() {
  const savedUser = localStorage.getItem('cashflowr-current-user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      // Verify user still exists
      if (users[currentUser.email]) {
        return true;
      } else {
        localStorage.removeItem('cashflowr-current-user');
        currentUser = null;
      }
    } catch (error) {
      localStorage.removeItem('cashflowr-current-user');
      currentUser = null;
    }
  }
  return false;
}

// Show/Hide Auth Modal
function showAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  document.body.classList.remove('dark');
}

function hideAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

// Switch between login and signup forms
function showLoginForm() {
  document.getElementById('loginForm').classList.add('active');
  document.getElementById('signupForm').classList.remove('active');
}

function showSignupForm() {
  document.getElementById('signupForm').classList.add('active');
  document.getElementById('loginForm').classList.remove('active');
}

// Update user interface
function updateUserInterface() {
  if (currentUser) {
    const initials = getInitials(currentUser.name);
    const greeting = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
    
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userMenuInitials').textContent = initials;
    document.getElementById('userGreeting').textContent = greeting;
    document.getElementById('userMenuName').textContent = currentUser.name;
    document.getElementById('userMenuEmail').textContent = currentUser.email;
    
    // Show logout button, hide sign in button
    document.getElementById('logoutBtn').style.display = 'flex';
    document.getElementById('signInBtn').style.display = 'none';
    
    // Load user-specific data
    loadUserData();
  } else {
    // Update interface for guest users
    document.getElementById('userGreeting').textContent = 'Welcome! Try adding a transaction to get started.';
    document.getElementById('userInitials').textContent = '👤';
    document.getElementById('userMenuInitials').textContent = '👤';
    document.getElementById('userMenuName').textContent = 'Guest User';
    document.getElementById('userMenuEmail').textContent = 'Not signed in';
    
    // Show sign in button, hide logout button
    document.getElementById('signInBtn').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'none';
  }
}

// Load user-specific data
function loadUserData() {
  if (currentUser) {
    // Load data for authenticated users
    const userDataKey = `cashflowr-user-data-${currentUser.id}`;
    const savedData = localStorage.getItem(userDataKey);
    
    if (savedData) {
      try {
        const userData = JSON.parse(savedData);
        transactions = userData.transactions || [];
        savingsGoal = userData.savingsGoal || 0;
        
        // Update goal display
        if (savingsGoal > 0) {
          goalAmountInput.value = savingsGoal;
          goalAmountDisplay.textContent = formatCurrency(savingsGoal, defaultCurrency);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        transactions = [];
        savingsGoal = 0;
      }
    } else {
      // Check for legacy data migration
      migrateLegacyData();
    }
  } else {
    // Load data for guest users
    loadAppData();
  }
}

// Save user-specific data
function saveUserData() {
  if (currentUser) {
    // Save to user-specific storage for authenticated users
    const userData = {
      transactions: transactions,
      savingsGoal: savingsGoal,
      lastUpdated: new Date().toISOString()
    };
    
    const userDataKey = `cashflowr-user-data-${currentUser.id}`;
    localStorage.setItem(userDataKey, JSON.stringify(userData));
  } else {
    // Save to local storage for guest users
    const appData = {
      transactions: transactions,
      savingsGoal: savingsGoal,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('cashflowr-app-data', JSON.stringify(appData));
  }
}

// Migrate legacy data for existing users
function migrateLegacyData() {
  const legacyData = localStorage.getItem('cashflowr-app-data');
  if (legacyData && currentUser) {
    try {
      const data = JSON.parse(legacyData);
      transactions = data.transactions || [];
      savingsGoal = data.savingsGoal || 0;
      
      // Save to user-specific storage
      saveUserData();
      
      // Remove legacy data
      localStorage.removeItem('cashflowr-app-data');
      
      showNotification('Your data has been migrated to your account!', 'success');
    } catch (error) {
      console.error('Error migrating legacy data:', error);
    }
  }
}

// User menu functionality
function toggleUserMenu() {
  console.log('toggleUserMenu called');
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.classList.toggle('active');
    console.log('User menu toggled, active class:', userMenu.classList.contains('active'));
  } else {
    console.error('User menu element not found');
  }
}

function hideUserMenu() {
  document.getElementById('userMenu').classList.remove('active');
}

// Setup user menu event listeners
function setupUserMenuListeners() {
  console.log('Setting up user menu listeners');
  const userMenuBtn = document.getElementById('userMenuBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const signInBtn = document.getElementById('signInBtn');
  
  console.log('User menu button found:', !!userMenuBtn);
  console.log('Logout button found:', !!logoutBtn);
  console.log('Sign in button found:', !!signInBtn);
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      console.log('User menu button clicked');
      e.preventDefault();
      toggleUserMenu();
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      console.log('Logout button clicked');
      e.preventDefault();
      logout();
    });
  }
  
  if (signInBtn) {
    signInBtn.addEventListener('click', (e) => {
      console.log('Sign in button clicked');
      e.preventDefault();
      hideUserMenu();
      showAuthModal();
      showLoginForm();
    });
  }

  // Hide user menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu-btn') && !e.target.closest('.user-menu')) {
      hideUserMenu();
    }
  });
}

// Setup authentication event listeners
function setupAuthListeners() {
  // Form submissions
  document.getElementById('loginFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (login(email, password)) {
      hideAuthModal();
      updateUserInterface();
      // Small delay to ensure chart is fully initialized before updating
      setTimeout(() => {
        updateUI();
      }, 100);
    }
  });

  document.getElementById('signupFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
      showAuthError('Passwords do not match');
      return;
    }
    
    if (signup(name, email, password)) {
      if (login(email, password)) {
        hideAuthModal();
        updateUserInterface();
        // Small delay to ensure chart is fully initialized before updating
        setTimeout(() => {
          updateUI();
        }, 100);
      }
    }
  });

  // Form switching
  document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
  });

  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // User menu event listeners will be set up after login

  // Password confirmation validation
  document.getElementById('signupConfirmPassword').addEventListener('input', (e) => {
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = e.target.value;
    
    if (confirmPassword && password !== confirmPassword) {
      e.target.setCustomValidity('Passwords do not match');
    } else {
      e.target.setCustomValidity('');
    }
  });
}

const transactionList = document.getElementById("transactionList");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");

// New elements for enhanced features
const goalAmountInput = document.getElementById("goalAmount");
const setGoalBtn = document.getElementById("setGoal");
const progressFill = document.getElementById("progressFill");
const progressAmount = document.getElementById("progressAmount");
const goalAmountDisplay = document.getElementById("goalAmountDisplay");
const progressPercentage = document.getElementById("progressPercentage");

// Filter elements
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const filterDate = document.getElementById("filterDate");
const clearFiltersBtn = document.getElementById("clearFilters");

let transactions = [];
let savingsGoal = 0;
let filteredTransactions = [];

// Currency Management
let defaultCurrency = 'PHP';
let exchangeRates = {};
let lastRatesUpdate = null;

// Currency symbols mapping
const currencySymbols = {
  'PHP': '₱',
  'USD': '$',
  'EUR': '€',
  'JPY': '¥'
};

// Currency names mapping
const currencyNames = {
  'PHP': 'Philippine Peso',
  'USD': 'US Dollar',
  'EUR': 'Euro',
  'JPY': 'Japanese Yen'
};

// Currency Management Functions
function getCurrencySymbol(currency) {
  return currencySymbols[currency] || '₱';
}

function formatCurrency(amount, currency = defaultCurrency) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  // If no exchange rates available, return original amount
  if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
    return amount;
  }
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / exchangeRates[fromCurrency];
  return usdAmount * exchangeRates[toCurrency];
}

function getTotalInCurrency(transactions, targetCurrency = defaultCurrency) {
  return transactions.reduce((total, transaction) => {
    const transactionCurrency = transaction.currency || defaultCurrency;
    const convertedAmount = convertCurrency(transaction.amount, transactionCurrency, targetCurrency);
    return total + convertedAmount;
  }, 0);
}

// Exchange Rates API Integration
async function fetchExchangeRates() {
  try {
    const updateBtn = document.getElementById('updateRates');
    const statusEl = document.getElementById('ratesStatus');
    
    // Show loading state
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="loading-rates"></span>Updating...';
    statusEl.textContent = 'Updating exchange rates...';
    statusEl.className = 'rates-status';
    
    // Using a free exchange rates API (ExchangeRate-API)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    
    // Store rates with USD as base
    exchangeRates = {
      'USD': 1,
      'PHP': data.rates.PHP,
      'EUR': data.rates.EUR,
      'JPY': data.rates.JPY
    };
    
    lastRatesUpdate = new Date();
    localStorage.setItem('cashflowr-exchange-rates', JSON.stringify({
      rates: exchangeRates,
      lastUpdate: lastRatesUpdate.toISOString()
    }));
    
    // Update UI
    statusEl.textContent = `Last updated: ${lastRatesUpdate.toLocaleString()}`;
    statusEl.className = 'rates-status updated';
    updateBtn.innerHTML = '🔄 Update Exchange Rates';
    updateBtn.disabled = false;
    
    showNotification('Exchange rates updated successfully!', 'success');
    
    // Update all displays with new rates
    updateUI();
    
    // Update savings goal display with new currency conversion
    updateSavingsProgress();
    
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    const updateBtn = document.getElementById('updateRates');
    const statusEl = document.getElementById('ratesStatus');
    
    updateBtn.innerHTML = '🔄 Update Exchange Rates';
    updateBtn.disabled = false;
    statusEl.textContent = 'Failed to update rates. Please try again.';
    statusEl.className = 'rates-status error';
    
    showNotification('Failed to update exchange rates. Please check your internet connection.', 'error');
  }
}

function loadExchangeRates() {
  const savedRates = localStorage.getItem('cashflowr-exchange-rates');
  if (savedRates) {
    try {
      const data = JSON.parse(savedRates);
      exchangeRates = data.rates;
      lastRatesUpdate = new Date(data.lastUpdate);
      
      const statusEl = document.getElementById('ratesStatus');
      if (statusEl) {
        statusEl.textContent = `Last updated: ${lastRatesUpdate.toLocaleString()}`;
        statusEl.className = 'rates-status updated';
      }
    } catch (error) {
      console.error('Error loading saved exchange rates:', error);
    }
  }
}

function saveCurrencySettings() {
  if (!currentUser) return;
  
  const currencySettings = {
    defaultCurrency: defaultCurrency,
    lastUpdated: new Date().toISOString()
  };
  
  const userSettingsKey = `cashflowr-currency-settings-${currentUser.id}`;
  localStorage.setItem(userSettingsKey, JSON.stringify(currencySettings));
}

function loadCurrencySettings() {
  if (!currentUser) return;
  
  const userSettingsKey = `cashflowr-currency-settings-${currentUser.id}`;
  const savedSettings = localStorage.getItem(userSettingsKey);
  
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      defaultCurrency = settings.defaultCurrency || 'PHP';
      
      // Update UI
      const defaultCurrencySelect = document.getElementById('defaultCurrency');
      if (defaultCurrencySelect) {
        defaultCurrencySelect.value = defaultCurrency;
      }
    } catch (error) {
      console.error('Error loading currency settings:', error);
    }
  }
}

// Initialize particles animation
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 2px and 6px
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random horizontal position
    particle.style.left = Math.random() * 100 + '%';
    
    // Random animation duration between 10s and 20s
    const duration = Math.random() * 10 + 10;
    particle.style.animationDuration = duration + 's';
    
    // Random delay
    particle.style.animationDelay = Math.random() * 5 + 's';
    
    particlesContainer.appendChild(particle);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupAuthListeners();
  
  // Always show main app directly (no authentication required)
  hideAuthModal();
  updateUserInterface(); // Update interface for guest or authenticated users
  loadUserData(); // Load data for both guest and authenticated users
  loadCurrencySettings();
  loadExchangeRates();
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    initializeChart();
  }, 100);
  setupEventListeners();
  setupUserMenuListeners();
  // Small delay to ensure chart is fully initialized before updating
  setTimeout(() => {
    updateUI();
  }, 100);
});

function updateUI() {
  // Apply filters first
  applyFilters();
  
  // Calculate totals in default currency
  let income = getTotalInCurrency(transactions.filter(t => t.type === "income"), defaultCurrency);
  let expense = getTotalInCurrency(transactions.filter(t => t.type === "expense"), defaultCurrency);
  let balance = income - expense;

  // Animate number changes with currency formatting
  animateNumberWithCurrency(totalIncomeEl, income, defaultCurrency);
  animateNumberWithCurrency(totalExpenseEl, expense, defaultCurrency);
  animateNumberWithCurrency(balanceEl, balance, defaultCurrency);

  // Display filtered transactions
  displayTransactions();
  
  updateChart();
  updateSavingsProgress();
  saveUserData();
}

function displayTransactions() {
  transactionList.innerHTML = "";
  
  // Use filtered transactions if filters are applied, otherwise show all
  const transactionsToShow = filteredTransactions.length > 0 ? filteredTransactions : transactions;
  
  transactionsToShow.forEach((t, index) => {
    let li = document.createElement("li");
    const transactionCurrency = t.currency || defaultCurrency;
    const convertedAmount = convertCurrency(t.amount, transactionCurrency, defaultCurrency);
    
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-desc">${t.desc}</span>
        <div class="transaction-meta">
          <span class="transaction-type ${t.type}">${t.type}</span>
          ${t.category ? `<span class="transaction-category">${t.category.replace('-', ' ')}</span>` : ''}
          <span class="transaction-currency">${getCurrencySymbol(transactionCurrency)}</span>
        </div>
      </div>
      <div class="transaction-amount">
        <span class="amount">${formatCurrency(convertedAmount, defaultCurrency)}</span>
        ${transactionCurrency !== defaultCurrency ? `<span class="original-amount">(${formatCurrency(t.amount, transactionCurrency)})</span>` : ''}
        <button onclick="deleteTransaction(${t.id})" class="delete-btn">🗑️</button>
      </div>
    `;
    transactionList.appendChild(li);
  });
}

// Animate number changes
function animateNumber(element, targetValue) {
  const startValue = parseFloat(element.textContent) || 0;
  const duration = 500;
  const startTime = performance.now();
  
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentValue = startValue + (targetValue - startValue) * easeOutCubic(progress);
    element.textContent = Math.round(currentValue).toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  }
  
  requestAnimationFrame(updateNumber);
}

// Animate number changes with currency formatting
function animateNumberWithCurrency(element, targetValue, currency) {
  const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
  const duration = 500;
  const startTime = performance.now();
  
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentValue = startValue + (targetValue - startValue) * easeOutCubic(progress);
    element.textContent = formatCurrency(Math.round(currentValue), currency);
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  }
  
  requestAnimationFrame(updateNumber);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  updateUI();
}

// Filtering functionality
function applyFilters() {
  const typeFilter = filterType.value;
  const categoryFilter = filterCategory.value;
  const dateFilter = filterDate.value;
  
  filteredTransactions = transactions.filter(transaction => {
    // Type filter
    if (typeFilter && transaction.type !== typeFilter) {
      return false;
    }
    
    // Category filter
    if (categoryFilter && transaction.category !== categoryFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter) {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          return transactionDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transactionDate >= weekAgo;
        case 'month':
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        case 'year':
          return transactionDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    }
    
    return true;
  });
  
  displayTransactions();
}

// Savings progress functionality
function updateSavingsProgress() {
  if (savingsGoal <= 0) {
    progressFill.style.width = '0%';
    progressAmount.textContent = formatCurrency(0, defaultCurrency);
    progressPercentage.textContent = '0%';
    return;
  }
  
  const totalIncome = getTotalInCurrency(transactions.filter(t => t.type === "income"), defaultCurrency);
  const totalExpense = getTotalInCurrency(transactions.filter(t => t.type === "expense"), defaultCurrency);
  const currentSavings = totalIncome - totalExpense;
  
  // Convert savings goal to current default currency if it was set in a different currency
  const convertedSavingsGoal = savingsGoal; // This assumes savings goal is already in the correct currency
  const progress = Math.min((currentSavings / convertedSavingsGoal) * 100, 100);
  const progressAmountValue = Math.max(currentSavings, 0);
  
  progressFill.style.width = `${progress}%`;
  progressAmount.textContent = formatCurrency(progressAmountValue, defaultCurrency);
  progressPercentage.textContent = `${Math.round(progress)}%`;
  
  // Update the goal amount display with current currency
  goalAmountDisplay.textContent = formatCurrency(convertedSavingsGoal, defaultCurrency);
  
  // Add celebration animation when goal is reached
  if (progress >= 100 && convertedSavingsGoal > 0) {
    progressFill.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    setTimeout(() => {
      showNotification('🎉 Congratulations! You reached your savings goal!', 'success');
    }, 500);
  } else {
    progressFill.style.background = 'var(--success-gradient)';
  }
}

// Enhanced localStorage functions
function saveAppData() {
  const appData = {
    transactions: transactions,
    savingsGoal: savingsGoal,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem('cashflowr-app-data', JSON.stringify(appData));
}

function loadAppData() {
  const saved = localStorage.getItem('cashflowr-app-data');
  if (saved) {
    try {
      const appData = JSON.parse(saved);
      transactions = appData.transactions || [];
      savingsGoal = appData.savingsGoal || 0;
      
      // Update goal display
      if (savingsGoal > 0) {
        goalAmountInput.value = savingsGoal;
        goalAmountDisplay.textContent = `₱${savingsGoal.toLocaleString()}`;
      }
    } catch (error) {
      console.error('Error loading app data:', error);
      // Fallback to old storage format
      const oldTransactions = localStorage.getItem('cashflowr-transactions');
      if (oldTransactions) {
        transactions = JSON.parse(oldTransactions);
        localStorage.removeItem('cashflowr-transactions'); // Clean up old storage
      }
    }
  }
}

// Legacy function for backward compatibility
function saveTransactions() {
  saveAppData();
}

// Setup event listeners
function setupEventListeners() {
  // Transaction form submission
  const transactionForm = document.getElementById("transactionFormElement");
  if (!transactionForm) {
    console.error("Transaction form not found!");
    return;
  }
  
  transactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const desc = document.getElementById("desc").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const currency = document.getElementById("currency").value;

    if (!desc || !amount || amount <= 0 || !category || !currency) {
      showNotification('Please fill in all fields with valid values', 'error');
      return;
    }

    transactions.push({ 
      desc, 
      amount, 
      type, 
      category,
      currency,
      date: new Date().toISOString(),
      id: Date.now()
    });
    
    transactionForm.reset();
    // Reset currency to default
    document.getElementById("currency").value = defaultCurrency;
    updateUI();
    showNotification('Transaction added successfully!', 'success');
    
    // Add pulse animation to the form
    transactionForm.classList.add('pulse');
    setTimeout(() => transactionForm.classList.remove('pulse'), 2000);
    
    // Show save data popup if this is the first transaction and user is not logged in
    if (transactions.length === 1 && !currentUser) {
      setTimeout(() => {
        showSaveDataPopup();
      }, 2000); // Show popup after success notification
    }
  });

  // Savings goal functionality
  setGoalBtn.addEventListener('click', () => {
    const goalAmount = parseFloat(goalAmountInput.value);
    if (goalAmount && goalAmount > 0) {
      savingsGoal = goalAmount;
      goalAmountDisplay.textContent = formatCurrency(goalAmount, defaultCurrency);
      saveUserData();
      updateSavingsProgress();
      showNotification('Savings goal set successfully!', 'success');
    } else {
      showNotification('Please enter a valid goal amount', 'error');
    }
  });

  // Filter functionality
  filterType.addEventListener('change', applyFilters);
  filterCategory.addEventListener('change', applyFilters);
  filterDate.addEventListener('change', applyFilters);
  
  clearFiltersBtn.addEventListener('click', () => {
    filterType.value = '';
    filterCategory.value = '';
    filterDate.value = '';
    applyFilters();
    showNotification('Filters cleared', 'info');
  });

  // Export/Import functionality
  setupExportImportListeners();
  
  // Currency settings functionality
  setupCurrencyListeners();
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  `;
  
  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else {
    notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Save data popup system
function showSaveDataPopup() {
  // Don't show popup if user is already logged in
  if (currentUser) return;
  
  // Don't show popup if it was already shown in this session
  if (sessionStorage.getItem('saveDataPopupShown')) return;
  
  const popup = document.createElement('div');
  popup.id = 'saveDataPopup';
  popup.innerHTML = `
    <div class="save-data-popup-overlay">
      <div class="save-data-popup">
        <div class="save-data-header">
          <h3>💾 Save Your Data</h3>
          <p>You've added some transactions! Create an account to save your data and access it from any device.</p>
        </div>
        <div class="save-data-actions">
          <button id="saveDataLogin" class="save-data-btn login-btn">Sign In</button>
          <button id="saveDataSignup" class="save-data-btn signup-btn">Create Account</button>
          <button id="saveDataLater" class="save-data-btn later-btn">Maybe Later</button>
        </div>
        <div class="save-data-info">
          <small>Your data is currently saved locally. Creating an account will sync it to the cloud.</small>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Add event listeners
  document.getElementById('saveDataLogin').addEventListener('click', () => {
    hideSaveDataPopup();
    showAuthModal();
    showLoginForm();
  });
  
  document.getElementById('saveDataSignup').addEventListener('click', () => {
    hideSaveDataPopup();
    showAuthModal();
    showSignupForm();
  });
  
  document.getElementById('saveDataLater').addEventListener('click', () => {
    hideSaveDataPopup();
    sessionStorage.setItem('saveDataPopupShown', 'true');
  });
  
  // Mark popup as shown
  sessionStorage.setItem('saveDataPopupShown', 'true');
}

function hideSaveDataPopup() {
  const popup = document.getElementById('saveDataPopup');
  if (popup) {
    popup.remove();
  }
}

// Chart.js Pie Chart with enhanced styling
let expenseChart;
function initializeChart() {
  const canvas = document.getElementById("expenseChartCanvas");
  console.log('Canvas element found:', canvas);
  console.log('Canvas tagName:', canvas ? canvas.tagName : 'null');
  if (!canvas) {
    console.error('Chart canvas element not found');
    return;
  }
  
  if (canvas.tagName !== 'CANVAS') {
    console.error('Element found is not a canvas:', canvas.tagName);
    return;
  }
  
  const ctx = canvas.getContext("2d");
  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",   // Food & Dining
          "rgba(34, 197, 94, 0.8)",   // Transportation
          "rgba(59, 130, 246, 0.8)",  // Housing
          "rgba(168, 85, 247, 0.8)",  // Utilities
          "rgba(245, 158, 11, 0.8)",  // Entertainment
          "rgba(236, 72, 153, 0.8)",  // Shopping
          "rgba(14, 165, 233, 0.8)",  // Healthcare
          "rgba(20, 184, 166, 0.8)",  // Education
          "rgba(107, 114, 128, 0.8)"  // Other Expense
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(168, 85, 247, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(236, 72, 153, 1)",
          "rgba(14, 165, 233, 1)",
          "rgba(20, 184, 166, 1)",
          "rgba(107, 114, 128, 1)"
        ],
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12,
              weight: '500'
            },
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  return {
                    text: `${label}: ${formatCurrency(value, defaultCurrency)}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].borderColor[i],
                    lineWidth: 2,
                    pointStyle: 'circle',
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${formatCurrency(value, defaultCurrency)} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

function updateChart() {
  if (!expenseChart) {
    console.warn('Chart not initialized yet, skipping update');
    return;
  }
  
  // Get expense transactions only
  const expenseTransactions = transactions.filter(t => t.type === "expense");
  
  if (expenseTransactions.length === 0) {
    // No expenses, show empty chart
    expenseChart.data.labels = [];
    expenseChart.data.datasets[0].data = [];
    expenseChart.update('active');
    return;
  }
  
  // Group expenses by category with currency conversion
  const categoryTotals = {};
  expenseTransactions.forEach(transaction => {
    const category = transaction.category || 'other-expense';
    const transactionCurrency = transaction.currency || defaultCurrency;
    const convertedAmount = convertCurrency(transaction.amount, transactionCurrency, defaultCurrency);
    categoryTotals[category] = (categoryTotals[category] || 0) + convertedAmount;
  });
  
  // Convert to arrays for chart
  const labels = [];
  const data = [];
  const colors = [];
  
  // Category mapping with display names
  const categoryNames = {
    'food': 'Food & Dining',
    'transportation': 'Transportation',
    'housing': 'Housing',
    'utilities': 'Utilities',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'other-expense': 'Other Expense'
  };
  
  // Sort categories by amount (descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a);
  
  sortedCategories.forEach(([category, amount]) => {
    labels.push(categoryNames[category] || category);
    data.push(amount);
    
    // Assign colors based on category
    const colorMap = {
      'food': "rgba(239, 68, 68, 0.8)",
      'transportation': "rgba(34, 197, 94, 0.8)",
      'housing': "rgba(59, 130, 246, 0.8)",
      'utilities': "rgba(168, 85, 247, 0.8)",
      'entertainment': "rgba(245, 158, 11, 0.8)",
      'shopping': "rgba(236, 72, 153, 0.8)",
      'healthcare': "rgba(14, 165, 233, 0.8)",
      'education': "rgba(20, 184, 166, 0.8)",
      'other-expense': "rgba(107, 114, 128, 0.8)"
    };
    colors.push(colorMap[category] || "rgba(107, 114, 128, 0.8)");
  });
  
  // Update chart data
  expenseChart.data.labels = labels;
  expenseChart.data.datasets[0].data = data;
  expenseChart.data.datasets[0].backgroundColor = colors;
  expenseChart.data.datasets[0].borderColor = colors.map(color => color.replace('0.8', '1'));
  
  expenseChart.update('active');
}

// Dark Mode Toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// Export & Import Functionality
function exportToCSV() {
  if (transactions.length === 0) {
    showNotification('No transactions to export', 'error');
    return;
  }

  try {
    // CSV Headers
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Currency'];
    
    // Convert transactions to CSV format
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        `"${t.desc.replace(/"/g, '""')}"`, // Escape quotes in description
        t.type,
        t.category || '',
        t.amount,
        t.currency || defaultCurrency
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflowr-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('CSV file exported successfully!', 'success');
  } catch (error) {
    console.error('CSV export error:', error);
    showNotification('Failed to export CSV file', 'error');
  }
}

function exportToJSON() {
  if (transactions.length === 0) {
    showNotification('No transactions to export', 'error');
    return;
  }

  try {
    const exportData = {
      appName: 'CashFlowr',
      version: '1.0',
      exportDate: new Date().toISOString(),
      transactions: transactions,
      savingsGoal: savingsGoal,
      totalTransactions: transactions.length,
      defaultCurrency: defaultCurrency,
      exchangeRates: exchangeRates,
      lastRatesUpdate: lastRatesUpdate
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create and download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cashflowr-data-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('JSON file exported successfully!', 'success');
  } catch (error) {
    console.error('JSON export error:', error);
    showNotification('Failed to export JSON file', 'error');
  }
}

function handleFileImport(file) {
  const fileName = document.getElementById('fileName');
  const processBtn = document.getElementById('processImport');
  
  if (!file) {
    fileName.textContent = 'No file selected';
    processBtn.disabled = true;
    return;
  }

  fileName.textContent = file.name;
  processBtn.disabled = false;
  
  // Store the file for processing
  window.selectedFile = file;
}

function processImport() {
  const file = window.selectedFile;
  if (!file) {
    showNotification('No file selected', 'error');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'csv') {
        importFromCSV(content);
      } else if (fileExtension === 'json') {
        importFromJSON(content);
      } else {
        showNotification('Unsupported file format. Please use CSV or JSON files.', 'error');
      }
    } catch (error) {
      console.error('File reading error:', error);
      showNotification('Failed to read file', 'error');
    }
  };
  
  reader.onerror = function() {
    showNotification('Failed to read file', 'error');
  };
  
  reader.readAsText(file);
}

function importFromCSV(content) {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      showNotification('CSV file appears to be empty or invalid', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = ['Date', 'Description', 'Type', 'Category', 'Amount'];
    const hasCurrency = headers.includes('Currency');
    
    // Validate headers
    if (!expectedHeaders.every(header => headers.includes(header))) {
      showNotification('Invalid CSV format. Expected headers: Date, Description, Type, Category, Amount', 'error');
      return;
    }

    const importedTransactions = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length !== expectedHeaders.length) {
          errors.push(`Row ${i + 1}: Invalid number of columns`);
          continue;
        }

        const transaction = {
          date: new Date(values[0]).toISOString(),
          desc: values[1].replace(/"/g, ''),
          type: values[2],
          category: values[3] || '',
          amount: parseFloat(values[4]),
          currency: hasCurrency && values[5] ? values[5] : defaultCurrency,
          id: Date.now() + i // Generate unique ID
        };

        // Validate transaction data
        if (!transaction.desc || !transaction.type || isNaN(transaction.amount) || transaction.amount <= 0) {
          errors.push(`Row ${i + 1}: Invalid transaction data`);
          continue;
        }

        if (!['income', 'expense'].includes(transaction.type)) {
          errors.push(`Row ${i + 1}: Invalid transaction type (must be 'income' or 'expense')`);
          continue;
        }

        importedTransactions.push(transaction);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (importedTransactions.length === 0) {
      showNotification('No valid transactions found in CSV file', 'error');
      return;
    }

    // Add imported transactions to existing ones
    transactions = [...transactions, ...importedTransactions];
    
    // Reset file input
    document.getElementById('importFile').value = '';
    document.getElementById('fileName').textContent = 'No file selected';
    document.getElementById('processImport').disabled = true;
    window.selectedFile = null;

    updateUI();
    
    const successMessage = `Successfully imported ${importedTransactions.length} transactions`;
    const errorMessage = errors.length > 0 ? ` (${errors.length} errors)` : '';
    showNotification(successMessage + errorMessage, errors.length > 0 ? 'warning' : 'success');

    if (errors.length > 0) {
      console.warn('Import errors:', errors);
    }
  } catch (error) {
    console.error('CSV import error:', error);
    showNotification('Failed to import CSV file', 'error');
  }
}

function importFromJSON(content) {
  try {
    const data = JSON.parse(content);
    
    // Validate JSON structure
    if (!data.transactions || !Array.isArray(data.transactions)) {
      showNotification('Invalid JSON format. Expected transactions array.', 'error');
      return;
    }

    const importedTransactions = [];
    const errors = [];

    data.transactions.forEach((transaction, index) => {
      try {
        // Validate required fields
        if (!transaction.desc || !transaction.type || !transaction.amount || !transaction.date) {
          errors.push(`Transaction ${index + 1}: Missing required fields`);
          return;
        }

        // Validate transaction type
        if (!['income', 'expense'].includes(transaction.type)) {
          errors.push(`Transaction ${index + 1}: Invalid type (must be 'income' or 'expense')`);
          return;
        }

        // Validate amount
        const amount = parseFloat(transaction.amount);
        if (isNaN(amount) || amount <= 0) {
          errors.push(`Transaction ${index + 1}: Invalid amount`);
          return;
        }

        // Create validated transaction
        const validatedTransaction = {
          desc: transaction.desc,
          type: transaction.type,
          category: transaction.category || '',
          amount: amount,
          date: new Date(transaction.date).toISOString(),
          id: Date.now() + index // Generate unique ID
        };

        importedTransactions.push(validatedTransaction);
      } catch (error) {
        errors.push(`Transaction ${index + 1}: ${error.message}`);
      }
    });

    if (importedTransactions.length === 0) {
      showNotification('No valid transactions found in JSON file', 'error');
      return;
    }

    // Import savings goal if present
    if (data.savingsGoal && data.savingsGoal > 0) {
      savingsGoal = data.savingsGoal;
      goalAmountInput.value = savingsGoal;
      goalAmountDisplay.textContent = formatCurrency(savingsGoal, defaultCurrency);
    }
    
    // Import currency settings if present
    if (data.defaultCurrency) {
      defaultCurrency = data.defaultCurrency;
      const defaultCurrencySelect = document.getElementById('defaultCurrency');
      if (defaultCurrencySelect) {
        defaultCurrencySelect.value = defaultCurrency;
      }
    }
    
    // Import exchange rates if present
    if (data.exchangeRates) {
      exchangeRates = data.exchangeRates;
      if (data.lastRatesUpdate) {
        lastRatesUpdate = new Date(data.lastRatesUpdate);
        const statusEl = document.getElementById('ratesStatus');
        if (statusEl) {
          statusEl.textContent = `Last updated: ${lastRatesUpdate.toLocaleString()}`;
          statusEl.className = 'rates-status updated';
        }
      }
    }

    // Add imported transactions to existing ones
    transactions = [...transactions, ...importedTransactions];
    
    // Reset file input
    document.getElementById('importFile').value = '';
    document.getElementById('fileName').textContent = 'No file selected';
    document.getElementById('processImport').disabled = true;
    window.selectedFile = null;

    updateUI();
    
    const successMessage = `Successfully imported ${importedTransactions.length} transactions`;
    const errorMessage = errors.length > 0 ? ` (${errors.length} errors)` : '';
    showNotification(successMessage + errorMessage, errors.length > 0 ? 'warning' : 'success');

    if (errors.length > 0) {
      console.warn('Import errors:', errors);
    }
  } catch (error) {
    console.error('JSON import error:', error);
    showNotification('Failed to import JSON file. Please check the file format.', 'error');
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Setup currency event listeners
function setupCurrencyListeners() {
  // Default currency selector
  const defaultCurrencySelect = document.getElementById('defaultCurrency');
  if (defaultCurrencySelect) {
    defaultCurrencySelect.addEventListener('change', (e) => {
      defaultCurrency = e.target.value;
      saveCurrencySettings();
      updateUI();
      updateSavingsProgress(); // Update savings goal display with new currency
      showNotification(`Default currency changed to ${currencyNames[defaultCurrency]}`, 'success');
    });
  }
  
  // Update exchange rates button
  const updateRatesBtn = document.getElementById('updateRates');
  if (updateRatesBtn) {
    updateRatesBtn.addEventListener('click', fetchExchangeRates);
  }
}

// Setup export/import event listeners
function setupExportImportListeners() {
  // Export buttons
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  document.getElementById('exportJSON').addEventListener('click', exportToJSON);
  
  // Import file handling
  const importFile = document.getElementById('importFile');
  const importBtn = document.getElementById('importBtn');
  const processBtn = document.getElementById('processImport');
  
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', (e) => {
    handleFileImport(e.target.files[0]);
  });
  
  processBtn.addEventListener('click', processImport);
  
  // Drag and drop support
  const importSection = document.querySelector('.import-section');
  
  importSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    importSection.classList.add('drag-over');
  });
  
  importSection.addEventListener('dragleave', (e) => {
    e.preventDefault();
    importSection.classList.remove('drag-over');
  });
  
  importSection.addEventListener('drop', (e) => {
    e.preventDefault();
    importSection.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        handleFileImport(file);
        importFile.files = files;
      } else {
        showNotification('Please drop a CSV or JSON file', 'error');
      }
    }
  });
}
