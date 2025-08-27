// Chart instances
let pieChart, lineChart, barChart;

function initializeCharts() {
  const isDark = document.body.classList.contains('dark');
  const textColor = isDark ? '#ffffff' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  // Pie
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: ['Pemasukan', 'Pengeluaran'],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: isDark ? '#374151' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } }
    }
  });

  // Line
  const lineCtx = document.getElementById('lineChart').getContext('2d');
  const last7 = getLast7DaysData();

  lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: last7.labels,
      datasets: [{
        label: 'Saldo Harian',
        data: last7.balances,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  // Bar
  const barCtx = document.getElementById('barChart').getContext('2d');
  const cat = getCategoryExpenseData();

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: cat.labels,
      datasets: [{
        label: 'Pengeluaran per Kategori',
        data: cat.amounts,
        backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6'],
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });
}

function updateCharts() {
  if (!pieChart || !lineChart || !barChart) return;

  const isDark = document.body.classList.contains('dark');
  const textColor = isDark ? '#ffffff' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  // Pie
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  pieChart.data.datasets[0].data = [totalIncome, totalExpense];
  pieChart.data.datasets[0].borderColor = isDark ? '#374151' : '#ffffff';
  pieChart.options.plugins.legend.labels.color = textColor;
  pieChart.update();

  // Line
  const last7 = getLast7DaysData();
  lineChart.data.labels = last7.labels;
  lineChart.data.datasets[0].data = last7.balances;
  lineChart.options.plugins.legend.labels.color = textColor;
  lineChart.options.scales.x.ticks.color = textColor;
  lineChart.options.scales.x.grid.color = gridColor;
  lineChart.options.scales.y.ticks.color = textColor;
  lineChart.options.scales.y.grid.color = gridColor;
  lineChart.update();

  // Bar
  const cat = getCategoryExpenseData();
  barChart.data.labels = cat.labels;
  barChart.data.datasets[0].data = cat.amounts;
  barChart.data.datasets[0].borderColor = isDark ? '#374151' : '#ffffff';
  barChart.options.plugins.legend.labels.color = textColor;
  barChart.options.scales.x.ticks.color = textColor;
  barChart.options.scales.x.grid.color = gridColor;
  barChart.options.scales.y.ticks.color = textColor;
  barChart.options.scales.y.grid.color = gridColor;
  barChart.update();
}

function getLast7DaysData() {
  const labels = [];
  const balances = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    labels.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));

    const dayTransactions = transactions.filter(t => t.date <= dateStr);
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    balances.push(dayIncome - dayExpense);
  }

  return { labels, balances };
}

function getCategoryExpenseData() {
  const categories = ['Makanan', 'Transportasi', 'Hiburan', 'Pendidikan', 'Tabungan', 'Lainnya'];
  const amounts = categories.map(cat =>
    transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0)
  );

  // Hanya kategori dengan nilai > 0
  return categories.reduce((acc, cat, i) => {
    if (amounts[i] > 0) { acc.labels.push(cat); acc.amounts.push(amounts[i]); }
    return acc;
  }, { labels: [], amounts: [] });
}

// Expose (optional if needed elsewhere)
window.updateCharts = updateCharts;
window.initializeCharts = initializeCharts;
