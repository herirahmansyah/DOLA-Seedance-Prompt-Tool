/* ==========================================================================
 * main.js — logika UI (dropdown, event listener, toast, history, share link,
 * import/export JSON, preset manager). Dibungkus IIFE sehingga tidak ada
 * variabel global baru selain namespace DOLA dari presets.js & generator.js.
 * ========================================================================== */
(function () {
  'use strict';

  const D = () => window.DOLA.data;
  const gen = () => window.DOLA.gen;
  const $ = (id) => document.getElementById(id);

  /* ---------------------------- Utilitas ---------------------------- */

  /* Tampilkan pesan toast sementara. */
  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* Baca JSON dari localStorage dengan aman (fallback bila korup). */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /* Tulis JSON ke localStorage dengan aman (tangani kuota penuh). */
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      toast('Penyimpanan lokal tidak tersedia');
      return false;
    }
  }

  /* Salin teks ke clipboard dengan fallback untuk context non-secure. */
  async function copyText(text, msg) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch (e2) {
        ok = false;
      }
    }
    toast(ok ? (msg || 'Tersalin ke clipboard') : 'Gagal menyalin ke clipboard');
  }

  /* Unduh string sebagai file. */
  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Gabungkan prompt + compact + negative untuk copy-all / download .txt. */
  function fullText() {
    return '=== PROMPT ===\n' + $('output').value +
      '\n\n=== COMPACT ===\n' + $('compact').value +
      '\n\n=== NEGATIVE ===\n' + $('negative').value;
  }

  /* ------------------------- Membangun dropdown ------------------------- */

  /* Buat 13 dropdown konfigurasi dari SELECTS/ORDER dan pasang event change. */
  function buildSelectGrid() {
    const grid = $('selectGrid');
    grid.textContent = '';
    D().ORDER.forEach((key) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label');
      lab.setAttribute('for', 'sel_' + key);
      lab.textContent = D().SELECTS[key].label;
      const sel = document.createElement('select');
      sel.id = 'sel_' + key;
      D().SELECTS[key].opts.forEach((o) => {
        const op = document.createElement('option');
        op.value = o;
        op.textContent = o;
        sel.appendChild(op);
      });
      wrap.append(lab, sel);
      grid.appendChild(wrap);
      sel.addEventListener('change', () => gen().build());
    });
  }

  /* ---------------------------- Preset Manager ---------------------------- */

  /* Ambil daftar preset custom dari localStorage (objek nama -> state). */
  function customPresets() {
    const map = readJSON(D().STORAGE.presets, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }

  /* Isi dropdown preset (bawaan dulu, lalu custom) dan pasang status tombol. */
  function renderPresetOptions(selectName) {
    const sel = $('preset');
    const custom = customPresets();
    sel.textContent = '';
    Object.keys(D().PRESETS).forEach((name) => {
      const op = document.createElement('option');
      op.value = name;
      op.textContent = name;
      sel.appendChild(op);
    });
    Object.keys(custom).forEach((name) => {
      const op = document.createElement('option');
      op.value = name;
      op.textContent = name + ' (custom)';
      sel.appendChild(op);
    });
    const target = selectName && Array.from(sel.options).some((o) => o.value === selectName)
      ? selectName
      : sel.options[0] && sel.options[0].value;
    if (target) sel.value = target;
    updatePresetButtons();
  }

  /* Nama preset terpilih apakah preset custom (bisa dihapus)? */
  function isCustomSelected() {
    const name = $('preset').value;
    return Object.prototype.hasOwnProperty.call(customPresets(), name);
  }

  /* Aktifkan/nonaktifkan tombol Hapus sesuai jenis preset terpilih. */
  function updatePresetButtons() {
    $('btnDeletePreset').disabled = !isCustomSelected();
  }

  /* Ubah objek preset menjadi state yang dikenali generator. */
  function presetToState(p) {
    const sel = {};
    D().ORDER.forEach((k) => { if (typeof p[k] === 'string') sel[k] = p[k]; });
    return {
      v: 1,
      sel,
      subject: typeof p.subject === 'string' ? p.subject : '',
      action: typeof p.action === 'string' ? p.action : '',
      environment: typeof p.environment === 'string' ? p.environment : '',
      extra: typeof p.extra === 'string' ? p.extra : '',
      dialog: typeof p.dialog === 'string' ? p.dialog : '',
      negative: typeof p.negative === 'string' ? p.negative : D().DEFAULT_NEG
    };
  }

  /* Terapkan preset terpilih (bawaan atau custom) ke form. */
  function applyPreset() {
    const name = $('preset').value;
    const custom = customPresets();
    const p = Object.prototype.hasOwnProperty.call(D().PRESETS, name)
      ? D().PRESETS[name]
      : custom[name];
    if (!p || typeof p !== 'object') {
      toast('Preset tidak ditemukan');
      return;
    }
    if (!gen().setState(presetToState(p))) {
      toast('Preset tidak valid');
      return;
    }
    toast('Preset "' + name + '" diterapkan');
  }

  /* Simpan state form saat ini sebagai preset custom baru. */
  function savePreset() {
    const input = $('presetName');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 40) {
      toast('Nama preset 1–40 karakter');
      input.focus();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(D().PRESETS, name)) {
      toast('Nama dipakai preset bawaan');
      input.focus();
      return;
    }
    const custom = customPresets();
    const isUpdate = Object.prototype.hasOwnProperty.call(custom, name);
    custom[name] = gen().getState();
    if (!writeJSON(D().STORAGE.presets, custom)) return;
    renderPresetOptions(name);
    input.value = '';
    toast(isUpdate ? 'Preset "' + name + '" diperbarui' : 'Preset "' + name + '" disimpan');
  }

  /* Hapus preset custom terpilih (preset bawaan tidak bisa dihapus). */
  function deletePreset() {
    const name = $('preset').value;
    const custom = customPresets();
    if (!Object.prototype.hasOwnProperty.call(custom, name)) {
      toast('Hanya preset custom yang bisa dihapus');
      return;
    }
    delete custom[name];
    writeJSON(D().STORAGE.presets, custom);
    renderPresetOptions();
    toast('Preset "' + name + '" dihapus');
  }

  /* ------------------------------- History ------------------------------- */

  /* Baca history dari localStorage (array, maksimal HISTORY_MAX entri). */
  function loadHistory() {
    const arr = readJSON(D().STORAGE.history, []);
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => e && typeof e === 'object' && e.state && typeof e.state === 'object');
  }

  /* Ringkasan singkat entri history untuk ditampilkan di daftar. */
  function makePreview(state) {
    const subject = (state.subject || '').trim() || '(tanpa subjek)';
    const s = state.sel || {};
    return subject + ' · ' + (s.shotSize || '') + ' · ' + (s.duration || '');
  }

  /* Simpan state ke history (dedupe entri teratas, buang yang paling lama). */
  function pushHistory(state) {
    const list = loadHistory();
    if (list[0] && JSON.stringify(list[0].state) === JSON.stringify(state)) return;
    list.unshift({ ts: Date.now(), state, preview: makePreview(state) });
    if (list.length > D().HISTORY_MAX) list.length = D().HISTORY_MAX;
    writeJSON(D().STORAGE.history, list);
  }

  /* Render daftar history ke panel (dibuat via DOM agar aman dari XSS). */
  function renderHistory() {
    const box = $('historyList');
    const list = loadHistory();
    box.textContent = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'hist-empty';
      empty.textContent = 'Belum ada history. Klik ⚡ Generate Prompt untuk menyimpan prompt terakhir (maksimal 20).';
      box.appendChild(empty);
      $('histClearAll').disabled = true;
      return;
    }
    $('histClearAll').disabled = false;
    list.forEach((entry, i) => {
      const item = document.createElement('div');
      item.className = 'hist-item';

      const meta = document.createElement('div');
      meta.className = 'hist-meta';
      const when = document.createElement('span');
      let time = '';
      try {
        time = new Date(entry.ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        time = new Date(entry.ts).toISOString();
      }
      when.textContent = time;
      const who = document.createElement('span');
      who.textContent = '#' + (list.length - i);
      meta.append(when, who);

      const prev = document.createElement('div');
      prev.className = 'hist-preview';
      prev.textContent = entry.preview || makePreview(entry.state);

      const actions = document.createElement('div');
      actions.className = 'hist-actions';
      const btnLoad = document.createElement('button');
      btnLoad.className = 'btn-sm';
      btnLoad.type = 'button';
      btnLoad.textContent = 'Load';
      btnLoad.addEventListener('click', () => {
        if (gen().setState(entry.state)) toast('History dimuat ⏪');
        else toast('History tidak valid');
      });
      const btnClear = document.createElement('button');
      btnClear.className = 'btn-sm danger';
      btnClear.type = 'button';
      btnClear.textContent = 'Clear';
      btnClear.addEventListener('click', () => {
        const next = loadHistory();
        next.splice(i, 1);
        writeJSON(D().STORAGE.history, next);
        renderHistory();
        toast('Entri dihapus');
      });
      actions.append(btnLoad, btnClear);

      item.append(meta, prev, actions);
      box.appendChild(item);
    });
  }

  /* Kosongkan seluruh history. */
  function clearAllHistory() {
    writeJSON(D().STORAGE.history, []);
    renderHistory();
    toast('History dibersihkan');
  }

  /* ------------------------------ Share Link ------------------------------ */

  /* Encode state ke URL, salin ke clipboard. */
  function shareLink() {
    const url = gen().buildShareUrl(gen.getState());
    copyText(url, 'Link share disalin 🔗');
  }

  /* Coba muat state dari query string ?s=... saat halaman dibuka. */
  function tryLoadShare() {
    let param = null;
    try {
      param = new URLSearchParams(window.location.search).get('s');
    } catch (e) {
      return false;
    }
    if (!param) return false;
    const raw = gen().decodeState(param);
    const ok = raw !== null && gen().setState(raw);
    // Bersihkan query agar reload berikutnya kembali ke keadaan normal.
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    } catch (e) { /* diabaikan */ }
    if (ok) toast('State dari share link dimuat 🔗');
    else toast('Share link tidak valid — memakai pengaturan default');
    return ok;
  }

  /* --------------------------- Import / Export --------------------------- */

  /* Unduh konfigurasi state sebagai file .json. */
  function exportJson() {
    const json = JSON.stringify(gen().exportPayload(), null, 2);
    downloadBlob(json, 'application/json', 'dola-seedance-config.json');
    toast('Konfigurasi diunduh ⬇');
  }

  /* Validasi + terapkan file JSON hasil pilihan pengguna. */
  function importJsonFile(file) {
    if (!file) return;
    if (file.size > D().IMPORT_MAX_BYTES) {
      toast('File terlalu besar (maks 200KB)');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast('Gagal membaca file');
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object') throw new Error('format');
        // Dukung format ter-ekspor {state:{...}} maupun state mentah {sel:{...}}.
        const state = data.state && typeof data.state === 'object' ? data.state : data;
        if (!gen().setState(state)) throw new Error('state');
        toast('Konfigurasi diimpor ⬆');
      } catch (e) {
        toast('File JSON tidak valid');
      }
    };
    reader.readAsText(file);
  }

  /* ---------------------------- Shot Breakdown ---------------------------- */

  /* Buat satu field (label + input/select) untuk panel breakdown. */
  function makeShotField(labelText, type, id, opt) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelText;

    let control;
    if (type === 'select') {
      control = document.createElement('select');
      opt.options.forEach((o) => {
        const op = document.createElement('option');
        op.value = o;
        op.textContent = o;
        control.appendChild(op);
      });
      if (opt.value && Array.from(control.options).some((o) => o.value === opt.value)) {
        control.value = opt.value;
      }
    } else {
      control = document.createElement('input');
      control.type = 'text';
      control.value = opt.value || '';
      if (opt.placeholder) control.placeholder = opt.placeholder;
    }
    control.id = id;
    control.addEventListener(type === 'select' ? 'change' : 'input', () => gen().build());

    wrap.append(lab, control);
    return wrap;
  }

  /* Kumpulkan nilai field per-klip yang sedang tampil agar tidak hilang
     saat panel dirender ulang (mis. ganti dari 2 ke 3 klip). */
  function collectShotFields() {
    const map = {};
    for (let n = 1; n <= D().MAX_CLIPS; n++) {
      const a = $('shot' + n + '_action');
      if (!a) continue;
      const g = $('shot' + n + '_dialog');
      const m = $('shot' + n + '_movement');
      const d = $('shot' + n + '_duration');
      map[n] = {
        action: a.value,
        dialog: g ? g.value : '',
        movement: m ? m.value : '',
        duration: d ? d.value : ''
      };
    }
    return map;
  }

  /* Render panel Shot Breakdown sesuai shot mode terpilih.
     Mode 1 -> panel disembunyikan, mode 2-4 -> tampil N sub-panel klip. */
  function renderShotBreakdown() {
    const box = $('shotBreakdown');
    if (!box) return;
    const prev = collectShotFields();
    const mode = gen().getShotMode();
    box.textContent = '';
    box.classList.toggle('open', mode > 1);
    if (mode === 1) return;

    const title = document.createElement('div');
    title.className = 'shot-header';
    title.textContent = 'Shot Breakdown (per klip)';
    box.appendChild(title);

    const globalMovement = $('sel_movement')
      ? $('sel_movement').value
      : D().SELECTS.movement.opts[0];

    for (let n = 1; n <= mode; n++) {
      const old = prev[n] || {};
      const panel = document.createElement('div');
      panel.className = 'shot-panel';

      const head = document.createElement('div');
      head.className = 'shot-header';
      head.textContent = '🎬 SHOT ' + n + ' (mulai ' + ((n - 1) * 15) + 's)';
      panel.appendChild(head);

      const fields = document.createElement('div');
      fields.className = 'shot-fields';
      fields.appendChild(makeShotField('Aksi', 'input', 'shot' + n + '_action', {
        value: old.action,
        placeholder: 'greets the viewer with a warm smile'
      }));
      fields.appendChild(makeShotField('Dialog', 'input', 'shot' + n + '_dialog', {
        value: old.dialog,
        placeholder: 'Dialog untuk klip ini (opsional)'
      }));
      fields.appendChild(makeShotField('Camera Movement', 'select', 'shot' + n + '_movement', {
        options: D().SELECTS.movement.opts,
        value: old.movement || globalMovement
      }));
      fields.appendChild(makeShotField('Duration', 'select', 'shot' + n + '_duration', {
        options: D().SHOT_DURATIONS,
        value: old.duration || '15s'
      }));
      panel.appendChild(fields);
      box.appendChild(panel);
    }
  }

  /* ----------------------------- Event UI ----------------------------- */

  /* Pasang seluruh event listener tombol dan input. */
  function bindEvents() {
    $('btnGen').addEventListener('click', () => {
      gen().build();
      pushHistory(gen().getState());
      renderHistory();
      toast('Prompt dibuat ✨');
    });

    $('btnRandom').addEventListener('click', () => {
      D().ORDER.forEach((k) => { $('sel_' + k).value = gen().pick(D().SELECTS[k].opts); });
      $('subject').value = gen().pick(D().RAND.subject);
      $('action').value = gen().pick(D().RAND.action);
      $('environment').value = gen().pick(D().RAND.environment);
      $('extra').value = gen().pick(D().RAND.extra);
      gen().build();
      toast('Randomized 🎲');
    });

    $('btnReset').addEventListener('click', () => {
      D().ORDER.forEach((k) => { $('sel_' + k).selectedIndex = 0; });
      ['subject', 'action', 'environment', 'extra', 'dialog'].forEach((id) => { $(id).value = ''; });
      $('output').value = '';
      $('compact').value = '';
      $('negative').value = D().DEFAULT_NEG;
      gen().updateCounter();
      toast('Direset');
    });

    ['subject', 'action', 'environment', 'extra', 'dialog'].forEach((id) => {
      $(id).addEventListener('input', () => gen().build());
    });
    $('negative').addEventListener('input', () => gen().updateCounter());

    // Shot mode -> render panel breakdown + bangun ulang prompt
    $('shotMode').addEventListener('change', () => {
      renderShotBreakdown();
      gen().build();
    });

    $('copyMain').addEventListener('click', () => copyText($('output').value, 'Prompt tersalin 📋'));
    $('copyAll').addEventListener('click', () => copyText(fullText(), 'Semua bagian tersalin 📦'));
    $('download').addEventListener('click', () => {
      downloadBlob(fullText(), 'text/plain', 'dola-seedance-prompt.txt');
      toast('File diunduh ⬇');
    });

    // Preset manager
    $('btnPreset').addEventListener('click', applyPreset);
    $('btnSavePreset').addEventListener('click', savePreset);
    $('btnDeletePreset').addEventListener('click', deletePreset);
    $('preset').addEventListener('change', updatePresetButtons);
    $('presetName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); savePreset(); }
    });

    // History
    $('histClearAll').addEventListener('click', clearAllHistory);

    // Share & import/export
    $('btnShare').addEventListener('click', shareLink);
    $('btnExport').addEventListener('click', exportJson);
    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      importJsonFile(e.target.files && e.target.files[0]);
      e.target.value = ''; // izinkan memilih file yang sama lagi
    });
  }

  /* ------------------------------- Init ------------------------------- */

  /* Inisialisasi halaman: bangun UI, muat share link/history, render. */
  function init() {
    buildSelectGrid();
    renderPresetOptions();
    bindEvents();
    renderShotBreakdown();
    $('negative').value = D().DEFAULT_NEG;
    const shared = tryLoadShare();
    if (!shared) gen().build();
    renderHistory();
    updatePresetButtons();
  }

  init();
})();
