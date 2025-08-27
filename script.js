// ===== Global state =====
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let savingsTarget = parseFloat(localStorage.getItem('savingsTarget')) || 0;
let currentCurrency = localStorage.getItem('currency') || 'IDR';
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let editingTransactionId = null;
let sortOrder = { date: 'desc', category: 'asc', amount: 'desc' };

// Currency symbols
const currencySymbols = {
  IDR: 'Rp ',
  USD: '$',
  EUR: '€'
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  registerServiceWorker();
});

// ===== PWA: Service Worker =====
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swCode = `
      const CACHE_NAME = 'finance-tracker-v1';
      const urlsToCache = ['/'];

      self.addEventListener('install', event => {
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
      });

      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request).then(response => response || fetch(event.request))
        );
      });
    `;

    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    navigator.serviceWorker.register(swUrl)
      .then(reg => {
        console.log('SW registered:', reg);
        showInstallPrompt();
      })
      .catch(err => console.log('SW registration failed:', err));
  }
}

// Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  if (deferredPrompt && !localStorage.getItem('pwaInstallDismissed')) {
    setTimeout(() => {
      Swal.fire({
        title: '📱 Install Aplikasi',
        text: 'Install Personal Finance Tracker untuk akses offline dan pengalaman yang lebih baik!',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Install',
        cancelButtonText: 'Nanti',
        confirmButtonColor: '#3b82f6'
      }).then((result) => {
        if (result.isConfirmed) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
        } else {
          localStorage.setItem('pwaInstallDismissed', 'true');
        }
      });
    }, 3000);
  }
}

// ===== Offline indicator =====
function setupOfflineDetection() {
  const offlineIndicator = document.getElementById('offlineIndicator');
  function updateOnlineStatus() {
    if (navigator.onLine) offlineIndicator.classList.add('hidden');
    else offlineIndicator.classList.remove('hidden');
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

// ===== App init =====
function initializeApp() {
  // Default date
  document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];

  // Currency & dark mode
  document.getElementById('currencySelect').value = currentCurrency;
  if (isDarkMode) {
    document.body.classList.add('dark');
    document.getElementById('darkModeIcon').textContent = '☀️';
  }

  updateDashboard();
  renderTransactionTable();
  initializeCharts();
  populateMonthFilter();

  setupEventListeners();
  setupOfflineDetection();
}

// ===== Events =====
function setupEventListeners() {
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

  document.getElementById('currencySelect').addEventListener('change', function () {
    currentCurrency = this.value;
    localStorage.setItem('currency', currentCurrency);
    updateDashboard();
    renderTransactionTable();
    updateCharts();
  });

  // Modal
  document.getElementById('addTransactionBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);

  // Form
  document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);

  // Export
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
  document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);

  // Filters
  document.getElementById('searchInput').addEventListener('input', filterTransactions);
  document.getElementById('categoryFilter').addEventListener('change', filterTransactions);
  document.getElementById('monthFilter').addEventListener('change', filterTransactions);
  document.getElementById('startDateFilter').addEventListener('change', filterTransactions);
  document.getElementById('endDateFilter').addEventListener('change', filterTransactions);

  // Savings
  document.getElementById('setSavingsTarget').addEventListener('click', setSavingsTarget);

  // Modal backdrop click
  document.getElementById('transactionModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
}

// ===== UI helpers =====
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark');
  document.getElementById('darkModeIcon').textContent = isDarkMode ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDarkMode);
  updateCharts();
}

function formatCurrency(amount) {
  const symbol = currencySymbols[currentCurrency];
  return symbol + Math.abs(amount).toLocaleString('id-ID');
}

// ===== Dashboard =====
function updateDashboard() {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  document.getElementById('totalBalance').textContent = formatCurrency(balance);
  document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);

  // Savings progress
  if (savingsTarget > 0) {
    const progress = Math.min((balance / savingsTarget) * 100, 100);
    document.getElementById('savingsProgress').textContent = Math.round(progress) + '%';
    document.getElementById('savingsBar').style.width = progress + '%';
  }
  document.getElementById('savingsTarget').textContent = 'Target: ' + formatCurrency(savingsTarget);

  updateCharts();
}

// ===== Modal =====
function openAddModal() {
  editingTransactionId = null;
  document.getElementById('modalTitle').textContent = 'Tambah Transaksi';
  document.getElementById('transactionForm').reset();
  document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('transactionModal').classList.remove('hidden');
  document.getElementById('transactionModal').classList.add('flex');
}

function openEditModal(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  editingTransactionId = id;
  document.getElementById('modalTitle').textContent = 'Edit Transaksi';
  document.getElementById('transactionType').value = transaction.type;
  document.getElementById('transactionCategory').value = transaction.category;
  document.getElementById('transactionAmount').value = transaction.amount;
  document.getElementById('transactionDate').value = transaction.date;
  document.getElementById('transactionDescription').value = transaction.description || '';

  document.getElementById('transactionModal').classList.remove('hidden');
  document.getElementById('transactionModal').classList.add('flex');
}

function closeModal() {
  document.getElementById('transactionModal').classList.add('hidden');
  document.getElementById('transactionModal').classList.remove('flex');
  editingTransactionId = null;
}

// ===== CRUD =====
function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    type: document.getElementById('transactionType').value,
    category: document.getElementById('transactionCategory').value,
    amount: parseFloat(document.getElementById('transactionAmount').value),
    date: document.getElementById('transactionDate').value,
    description: document.getElementById('transactionDescription').value || ''
  };

  if (editingTransactionId) {
    const index = transactions.findIndex(t => t.id === editingTransactionId);
    transactions[index] = { ...transactions[index], ...formData };

    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Transaksi berhasil diperbarui!', timer: 2000, showConfirmButton: false });
  } else {
    const newTransaction = { id: Date.now().toString(), ...formData };
    transactions.unshift(newTransaction);

    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Transaksi berhasil ditambahkan!', timer: 2000, showConfirmButton: false });
  }

  localStorage.setItem('transactions', JSON.stringify(transactions));
  updateDashboard();
  renderTransactionTable();
  populateMonthFilter();
  closeModal();
}

function deleteTransaction(id) {
  Swal.fire({
    title: 'Hapus Transaksi?',
    text: 'Transaksi yang dihapus tidak dapat dikembalikan!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      transactions = transactions.filter(t => t.id !== id);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      updateDashboard();
      renderTransactionTable();
      populateMonthFilter();

      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Transaksi berhasil dihapus.', timer: 2000, showConfirmButton: false });
    }
  });
}

// ===== Table render & filters =====
function renderTransactionTable() {
  const tbody = document.getElementById('transactionTableBody');

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          Belum ada transaksi. Tambahkan transaksi pertama Anda!
        </td>
      </tr>`;
    return;
  }

  const filteredTransactions = filterTransactionData();

  tbody.innerHTML = filteredTransactions.map(transaction => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        ${new Date(transaction.date).toLocaleDateString('id-ID')}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        ${transaction.category}
      </td>
      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
        ${transaction.description || '-'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.type === 'income' ? 'income' : 'expense'}">
        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        <button onclick="openEditModal('${transaction.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">✏️</button>
        <button onclick="deleteTransaction('${transaction.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">❌</button>
      </td>
    </tr>
  `).join('');
}

function populateMonthFilter() {
  const monthFilter = document.getElementById('monthFilter');
  const months = new Set();

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.add(monthYear);
  });

  monthFilter.innerHTML = '<option value="">Semua Bulan</option>';

  Array.from(months).sort().reverse().forEach(monthYear => {
    const [year, month] = monthYear.split('-');
    const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const option = document.createElement('option');
    option.value = monthYear;
    option.textContent = `${monthNames[parseInt(month) - 1]} ${year}`;
    monthFilter.appendChild(option);
  });
}

function filterTransactionData() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const monthFilter = document.getElementById('monthFilter').value;
  const startDate = document.getElementById('startDateFilter').value;
  const endDate = document.getElementById('endDateFilter').value;

  return transactions.filter(transaction => {
    const matchesSearch = !searchTerm ||
      (transaction.description && transaction.description.toLowerCase().includes(searchTerm)) ||
      transaction.category.toLowerCase().includes(searchTerm);

    const matchesCategory = !categoryFilter || transaction.category === categoryFilter;

    // Month filter
    let matchesMonth = true;
    if (monthFilter) {
      const d = new Date(transaction.date);
      const my = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = my === monthFilter;
    }

    // Date range
    let matchesDateRange = true;
    if (startDate || endDate) {
      const d = new Date(transaction.date);
      if (startDate) matchesDateRange = matchesDateRange && d >= new Date(startDate);
      if (endDate)   matchesDateRange = matchesDateRange && d <= new Date(endDate);
    }

    return matchesSearch && matchesCategory && matchesMonth && matchesDateRange;
  });
}

function filterTransactions() {
  renderTransactionTable();
}

function sortTable(column) {
  const currentOrder = sortOrder[column];
  const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
  sortOrder[column] = newOrder;

  transactions.sort((a, b) => {
    let A, B;
    if (column === 'date') { A = new Date(a.date); B = new Date(b.date); }
    if (column === 'category') { A = (a.category || '').toLowerCase(); B = (b.category || '').toLowerCase(); }
    if (column === 'amount') { A = a.amount; B = b.amount; }
    return newOrder === 'asc' ? (A > B ? 1 : -1) : (A < B ? 1 : -1);
  });

  // Icons
  document.getElementById('dateSortIcon').textContent = column === 'date' ? (newOrder === 'asc' ? '↑' : '↓') : '↕️';
  document.getElementById('categorySortIcon').textContent = column === 'category' ? (newOrder === 'asc' ? '↑' : '↓') : '↕️';
  document.getElementById('amountSortIcon').textContent = column === 'amount' ? (newOrder === 'asc' ? '↑' : '↓') : '↕️';

  renderTransactionTable();
}

// ===== Savings =====
function setSavingsTarget() {
  Swal.fire({
    title: 'Set Target Tabungan',
    input: 'number',
    inputLabel: 'Target Tabungan (' + currencySymbols[currentCurrency] + ')',
    inputValue: savingsTarget,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    inputValidator: (value) => {
      if (value === '' || value < 0) return 'Masukkan target yang valid!';
    }
  }).then((result) => {
    if (result.isConfirmed) {
      savingsTarget = parseFloat(result.value);
      localStorage.setItem('savingsTarget', savingsTarget);
      updateDashboard();

      Swal.fire({ icon: 'success', title: 'Target Disimpan!', text: `Target tabungan: ${formatCurrency(savingsTarget)}`, timer: 2000, showConfirmButton: false });
    }
  });
}

// Expose for inline handlers
window.sortTable = sortTable;
window.openEditModal = openEditModal;
window.deleteTransaction = deleteTransaction;
