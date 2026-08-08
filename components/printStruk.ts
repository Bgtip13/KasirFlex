type StrukItem = { nama: string; qty: number; harga: number };

type PrintData = {
  invoiceNo: string;
  tanggal: string;
  items: StrukItem[];
  total: number;
  toko: { nama_toko: string; no_hp: string; alamat: string };
};

export default function printStruk(d: PrintData) {
  const itemsHtml = d.items
    .map(
      (it) => `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${escapeHtml(it.nama)}</span>
          <span>${formatRp(it.harga)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;">
          <span>${it.qty} x ${formatRp(it.harga)}</span>
          <span style="font-weight:600;color:#222;">${formatRp(it.harga * it.qty)}</span>
        </div>
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(d.invoiceNo)}</title>
  <style>
    body { font-family: 'Courier New', monospace; margin: 0; padding: 16px; background: #fff; color: #111; }
    .struk { max-width: 320px; margin: 0 auto; }
    .center { text-align: center; }
    .dashed { border-top: 1px dashed #000; margin: 8px 0; }
    .foot { text-align: center; font-size: 10px; margin-top: 10px; }
    .brand { color: #059669; font-weight: bold; }
    .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="struk">
    <div class="center" style="font-weight:bold;font-size:15px;">${escapeHtml(d.toko.nama_toko || 'KasirFlex')}</div>
    ${d.toko.no_hp ? `<div class="center" style="font-size:11px;">${escapeHtml(d.toko.no_hp)}</div>` : ''}
    ${d.toko.alamat ? `<div class="center" style="font-size:11px;">${escapeHtml(d.toko.alamat)}</div>` : ''}
    <div class="dashed"></div>
    <div class="center" style="font-weight:bold;font-size:12px;">${escapeHtml(d.invoiceNo)}</div>
    <div class="center" style="font-size:11px;color:#555;">${escapeHtml(d.tanggal)}</div>
    <div class="dashed"></div>
    ${itemsHtml}
    <div class="dashed"></div>
    <div class="total"><span>TOTAL</span><span>${formatRp(d.total)}</span></div>
    <div class="foot">Terima kasih atas kunjungan Anda</div>
    <div class="foot brand">KasirFlex by NB Projects</div>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=420,height=600');

  // JIKA POPUP DIBLOKIR → cetak di halaman ini (CSS cetak akan menampilkan struk saja)
  if (!w) {
    window.print();
    return;
  }

  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRp(n: number) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
