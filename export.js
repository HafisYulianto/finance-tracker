function exportToPDF() {
  const filteredTransactions = (typeof filterTransactionData === 'function') ? filterTransactionData() : [];
  const element = document.createElement('div');

  element.innerHTML = `
    <div style="padding:20px;font-family:Arial,sans-serif;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#1f2937;margin-bottom:10px;">💰 Personal Finance Tracker</h1>
        <p style="color:#6b7280;">Laporan Keuangan - ${new Date().toLocaleDateString('id-ID')}</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:30px;">
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;">
          <h3 style="margin:0;color:#374151;">Saldo Total</h3>
          <p style="font-size:24px;font-weight:bold;margin:10px 0;color:#1f2937;">
            ${document.getElementById('totalBalance').textContent}
          </p>
        </div>
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;">
          <h3 style="margin:0;color:#374151;">Total Pemasukan</h3>
          <p style="font-size:24px;font-weight:bold;margin:10px 0;color:#10b981;">
            ${document.getElementById('totalIncome').textContent}
          </p>
        </div>
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;">
          <h3 style="margin:0;color:#374151;">Total Pengeluaran</h3>
          <p style="font-size:24px;font-weight:bold;margin:10px 0;color:#ef4444;">
            ${document.getElementById('totalExpense').textContent}
          </p>
        </div>
      </div>

      <h2 style="color:#1f2937;margin-bottom:20px;">Riwayat Transaksi</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Tanggal</th>
            <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Kategori</th>
            <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Deskripsi</th>
            <th style="padding:12px;text-align:left;border:1px solid #e5e7eb;">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions.map(t => `
            <tr>
              <td style="padding:12px;border:1px solid #e5e7eb;">${new Date(t.date).toLocaleDateString('id-ID')}</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">${t.category}</td>
              <td style="padding:12px;border:1px solid #e5e7eb;">${t.description || '-'}</td>
              <td style="padding:12px;border:1px solid #e5e7eb; color:${t.type === 'income' ? '#10b981' : '#ef4444'};">
                ${t.type === 'income' ? '+' : '-'}${(typeof formatCurrency === 'function') ? formatCurrency(t.amount) : t.amount}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const opt = {
    margin: 1,
    filename: `laporan-keuangan-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    Swal.fire({ icon: 'success', title: 'PDF Berhasil Diunduh!', text: 'Laporan keuangan telah disimpan.', timer: 2000, showConfirmButton: false });
  });
}

function exportToExcel() {
  const filteredTransactions = (typeof filterTransactionData === 'function') ? filterTransactionData() : [];
  const data = filteredTransactions.map(t => ({
    'Tanggal': new Date(t.date).toLocaleDateString('id-ID'),
    'Jenis': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': t.category,
    'Deskripsi': t.description || '-',
    'Jumlah': t.amount
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

  const filename = `transaksi-keuangan-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);

  Swal.fire({ icon: 'success', title: 'Excel Berhasil Diunduh!', text: 'Data transaksi telah disimpan.', timer: 2000, showConfirmButton: false });
}

// Expose
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
