/* ==========================================================================
 * generator.js — logika inti prompt (tanpa UI event)
 * Berisi: cap(), pick(), build(), updateCounter(), serta serialisasi state
 * (getState/setState/validateState), encode-decode Share Link, dan payload
 * Export JSON. Semua fungsi diekspos lewat `DOLA.gen`.
 * ========================================================================== */
(function () {
  'use strict';

  window.DOLA = window.DOLA || {};

  const D = () => window.DOLA.data; // akses data (presets.js harus load duluan)
  const $ = (id) => document.getElementById(id);

  /* Huruf besar di awal kalimat. */
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  /* Pilih satu item acak dari array. */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* Baca seluruh state form menjadi satu objek serializable. */
  function getState() {
    const sel = {};
    D().ORDER.forEach((k) => {
      const el = $('sel_' + k);
      if (el) sel[k] = el.value;
    });
    const text = (id) => {
      const el = $(id);
      return el ? String(el.value) : '';
    };
    return {
      v: 1,
      sel,
      subject: text('subject'),
      action: text('action'),
      environment: text('environment'),
      extra: text('extra'),
      dialog: text('dialog'),
      negative: text('negative')
    };
  }

  /* Validasi state mentah (dari share link / file JSON / history).
     Mengembalikan state bersih, atau null bila bukan objek valid. */
  function validateState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const data = D();
    const src = raw.sel && typeof raw.sel === 'object' ? raw.sel : {};
    const sel = {};
    data.ORDER.forEach((k) => {
      const opts = data.SELECTS[k].opts;
      const val = typeof src[k] === 'string' ? src[k] : null;
      // Nilai di luar daftar option (atau tipe salah) jatuh ke opsi pertama.
      sel[k] = val && opts.includes(val) ? val : opts[0];
    });
    const str = (key, def) => (typeof raw[key] === 'string' ? raw[key] : def);
    return {
      v: 1,
      sel,
      subject: str('subject', ''),
      action: str('action', ''),
      environment: str('environment', ''),
      extra: str('extra', ''),
      dialog: str('dialog', ''),
      negative: str('negative', data.DEFAULT_NEG)
    };
  }

  /* Terapkan state valid ke form; mengembalikan true bila berhasil. */
  function setState(raw) {
    const st = validateState(raw);
    if (!st) return false;
    D().ORDER.forEach((k) => {
      const el = $('sel_' + k);
      if (el) el.value = st.sel[k];
    });
    ['subject', 'action', 'environment', 'extra', 'dialog', 'negative'].forEach((id) => {
      const el = $(id);
      if (el) el.value = st[id];
    });
    build();
    return true;
  }

  /* Susun prompt utama + versi ringkas dari state form saat ini. */
  function build() {
    const st = getState();
    const v = st.sel;

    const subject = st.subject.trim() || 'the main subject';
    const action = st.action.trim();
    const env = st.environment.trim();
    const extra = st.extra.trim();
    const dialog = st.dialog.trim();
    // Dialog memaksa audio "dialogue with room tone" hanya untuk output prompt;
    // nilai audio pilihan pengguna tidak diubah di form.
    const audio = dialog ? 'dialogue with room tone' : v.audio;

    const L = [];
    L.push(cap(v.shotSize) + ' at ' + v.angle + ', shot on a ' + v.lens + '.');
    L.push(cap(subject) + (action ? ' ' + action : '') + (env ? ', set in ' + env : '') + '.');
    L.push('Camera: ' + v.movement + '.');
    L.push('Lighting: ' + v.lighting + '. Color grade: ' + v.color + '. Mood: ' + v.mood + '.');
    L.push('Style: ' + v.style + (extra ? '. Details: ' + extra : '') + '.');
    L.push('Audio: ' + audio + '.');
    if (dialog) L.push('Dialogue (spoken in Indonesian): "' + dialog + '"');
    L.push('Output: ' + v.duration + ', ' + v.ratio + ', ' + v.resolution + ', ' + v.fps + '.');

    $('output').value = L.join('\n');

    $('compact').value =
      cap(v.shotSize) + ' of ' + subject +
      (action ? ', ' + action : '') +
      (env ? ', ' + env : '') + ' — ' + v.movement +
      ', ' + v.lighting + ', ' + v.style +
      ', ' + v.color + ', ' + v.ratio + ' ' + v.duration +
      (dialog ? ", speaking: '" + dialog + "'" : '') + '.';

    updateCounter();
  }

  /* Perbarui penghitung karakter di header panel output. */
  function updateCounter() {
    const total = $('output').value.length + $('compact').value.length + $('negative').value.length;
    $('counter').textContent = total + ' karakter';
  }

  /* --- Serialisasi Share Link (UTF-8 aman: JSON -> UTF8 bytes -> base64) --- */

  function b64FromUtf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function utf8FromB64(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /* Encode state menjadi parameter query (?s=...) yang URL-safe. */
  function encodeState(state) {
    return encodeURIComponent(b64FromUtf8(JSON.stringify(state)));
  }

  /* Decode parameter query kembali jadi objek state mentah; null bila gagal. */
  function decodeState(param) {
    try {
      return JSON.parse(utf8FromB64(decodeURIComponent(param)));
    } catch (e) {
      return null;
    }
  }

  /* Bangun URL lengkap berisi state untuk dibagikan. */
  function buildShareUrl(state) {
    const base = location.href.split('?')[0].split('#')[0];
    return base + '?s=' + encodeState(state);
  }

  /* Payload standar untuk Export JSON. */
  function exportPayload(state) {
    return {
      app: 'DOLA Seedance Prompt Tool',
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state || getState()
    };
  }

  window.DOLA.gen = {
    cap, pick,
    getState, setState, validateState,
    build, updateCounter,
    encodeState, decodeState, buildShareUrl,
    exportPayload
  };
})();
