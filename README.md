# DOLA · Seedance Prompt Generator

Generator prompt video terstruktur (shot → subjek → kamera → cahaya → gaya → audio → spesifikasi output) untuk model text-to-video seperti **Seedance**. Dibangun dengan **vanilla HTML/CSS/JS** — tanpa framework, tanpa build step, tanpa dependency eksternal.

## Fitur

- **13 dropdown konfigurasi** (shot size, angle, lens, movement, lighting, color grade, visual style, mood, audio, duration, aspect ratio, resolution, frame rate) + 4 isian bebas (subjek, aksi, latar, detail tambahan).
- **Generate Prompt** → prompt utama, versi ringkas (*one-liner*), dan negative prompt.
- **7 preset bawaan** (Cinematic Drama, Product Commercial, Anime Action, Nature Documentary, Cyberpunk Night, Food & Beverage, Fashion Editorial).
- **Preset Manager** — simpan konfigurasi saat ini sebagai preset custom di localStorage (bisa diterapkan/dihapus kembali).
- **History** — 20 prompt terakhir disimpan di localStorage, tiap entri punya tombol **Load** dan **Clear**, plus **Bersihkan** semua.
- **Share Link** — seluruh state form di-encode ke query string (`?s=` + JSON + base64, UTF-8 aman) dan otomatis dimuat saat halaman dibuka lewat link tersebut.
- **Export / Import JSON** — unduh konfigurasi sebagai `dola-seedance-config.json` atau muat kembali dari file `.json`.
- **Copy Prompt / Copy Semua / Download .txt / Randomize / Reset**.
- Tema **dark + aksen gradient biru-ungu**, responsif pada breakpoint **980px** dan **520px**.

## Cara Menjalankan

Tanpa install apa pun — cukup sajikan folder ini via HTTP:

```bash
# opsi 1: Python
python -m http.server 5500
# lalu buka http://localhost:5500

# opsi 2: VS Code Live Server
# klik kanan index.html → "Open with Live Server"
```

> Catatan: fitur Share Link/clipboard bekerja paling baik diakhiri `http://localhost` (secure context). Membuka `index.html` langsung via `file://` sebagian besar fitur tetap jalan, tetapi clipboard API bisa jatuh ke fallback.

## Struktur Folder

```
dola-seedance-prompt-tool/
├── index.html              # markup halaman
├── README.md
├── LICENSE                 # MIT
├── .gitignore
└── assets/
    ├── css/
    │   └── style.css       # tema asli + gaya panel baru
    └── js/
        ├── presets.js      # data statis: SELECTS, ORDER, PRESETS, RAND, DEFAULT_NEG
        ├── generator.js    # logika inti: build, state, encode/decode share link
        └── main.js         # UI: dropdown, event, toast, history, preset manager, import/export
```

### Pemisahan kode

Ketiga file JS memakai pola **IIFE** dan hanya berbagi satu namespace global: `window.DOLA` (diisi `presets.js`, dilanjuti `generator.js`, dikonsumsi `main.js`). Urutan load wajib: `presets.js` → `generator.js` → `main.js`.

### Lokasi data pengguna (localStorage)

| Key | Isi |
|---|---|
| `dola.history.v1` | Array history prompt, maksimal 20 entri |
| `dola.presets.v1` | Objek preset custom: `{ "Nama Preset": state }` |

### Format state

```json
{
  "v": 1,
  "sel": { "shotSize": "medium shot", "...": "..." },
  "subject": "...",
  "action": "...",
  "environment": "...",
  "extra": "...",
  "negative": "..."
}
```

Nilai di luar daftar option akan dijatuhkan ke opsi pertama (validasi saat load), sehingga link/file lama tetap aman dibuka.

## Cara Kontribusi

1. Fork dan buat branch fitur: `git checkout -b fitur/nama-fitur`.
2. Jaga pendekatan vanilla (tanpa dependency) dan gaya visual yang ada.
3. Pisahkan data (`presets.js`), logika (`generator.js`), dan UI (`main.js`).
4. Pastikan tidak ada error di console saat halaman dimuat, lalu uji manual: Generate, Copy, Download, Randomize, Reset, History, Share Link, Export/Import JSON.
5. Buka Pull Request dengan deskripsi perubahan yang jelas.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
