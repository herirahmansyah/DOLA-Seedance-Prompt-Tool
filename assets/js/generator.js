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

  /* Baca state semua field per-klip (mode multi-shot) dari form. */
  function readShots(clipCount) {
    const data = D();
    const shots = [];
    for (let n = 1; n <= clipCount; n++) {
      const def = data.DEFAULT_SHOTS[(n - 1) % data.DEFAULT_SHOTS.length];
      const mv = shotField(n, 'movement', def.movement);
      const du = shotField(n, 'duration', def.duration);
      shots.push({
        action: shotField(n, 'action', def.action),
        dialog: shotField(n, 'dialog', def.dialog),
        movement: data.SELECTS.movement.opts.includes(mv) ? mv : def.movement,
        duration: data.SHOT_DURATIONS.includes(du) ? du : def.duration
      });
    }
    return shots;
  }

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
    const shotMode = getShotMode();
    return {
      v: 1,
      shotMode,
      sel,
      subject: text('subject'),
      action: text('action'),
      environment: text('environment'),
      extra: text('extra'),
      dialog: text('dialog'),
      shots: readShots(shotMode),
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

    // shotMode: wajib 1-4; state lama tanpa shotMode jatuh ke 1 (single shot).
    const modeNum = typeof raw.shotMode === 'number' && Number.isFinite(raw.shotMode)
      ? Math.round(raw.shotMode)
      : (typeof raw.shotMode === 'string' && /^\s*\d+\s*$/.test(raw.shotMode) ? parseInt(raw.shotMode, 10) : NaN);
    const shotMode = data.SHOT_MODES.some((m) => m.value === modeNum) ? modeNum : 1;
    const clipCount = data.SHOT_MODES.find((m) => m.value === shotMode).clipCount;

    return {
      v: 1,
      shotMode,
      sel,
      subject: str('subject', ''),
      action: str('action', ''),
      environment: str('environment', ''),
      extra: str('extra', ''),
      dialog: str('dialog', ''),
      shots: normalizeShots(raw.shots, clipCount),
      negative: str('negative', data.DEFAULT_NEG)
    };
  }

  /* Normalisasi daftar shots: panjang mengikuti jumlah klip dan tiap field
     divalidasi; nilai tidak valid jatuh ke DEFAULT_SHOTS. */
  function normalizeShots(rawShots, clipCount) {
    const data = D();
    const arr = Array.isArray(rawShots) ? rawShots : [];
    const out = [];
    for (let i = 0; i < clipCount; i++) {
      const def = data.DEFAULT_SHOTS[i % data.DEFAULT_SHOTS.length];
      const s = arr[i] && typeof arr[i] === 'object' && !Array.isArray(arr[i]) ? arr[i] : {};
      out.push({
        action: typeof s.action === 'string' ? s.action : def.action,
        dialog: typeof s.dialog === 'string' ? s.dialog : def.dialog,
        movement: typeof s.movement === 'string' && data.SELECTS.movement.opts.includes(s.movement)
          ? s.movement : def.movement,
        duration: typeof s.duration === 'string' && data.SHOT_DURATIONS.includes(s.duration)
          ? s.duration : def.duration
      });
    }
    return out;
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

    // Shot mode: ganti nilai lalu render ulang panel breakdown (listener di
    // main.js), baru isi field per-klip dengan nilai yang dipulihkan.
    const modeEl = $('shotMode');
    if (modeEl) {
      modeEl.value = String(st.shotMode);
      modeEl.dispatchEvent(new Event('change'));
      for (let n = 1; n <= st.shotMode; n++) {
        const s = st.shots[n - 1];
        [['action', s.action], ['dialog', s.dialog], ['movement', s.movement], ['duration', s.duration]]
          .forEach(([key, val]) => {
            const el = $('shot' + n + '_' + key);
            if (el) el.value = val;
          });
      }
    }

    build();
    return true;
  }

  /* Batas detik per klip pada mode multi-shot (Seedance maks 15 detik). */
  const CLIP_SECONDS = 15;

  /* Pembuka kontinuitas untuk prompt klip ke-2 dan seterusnya. */
  const CONTINUITY_CUE =
    'Continuing seamlessly from the previous scene, same character, same location, same lighting:';

  /* Baca nilai integer shot mode (1-4) dari #shotMode; fallback ke 1. */
  function getShotMode() {
    const el = $('shotMode');
    const n = el ? parseInt(el.value, 10) : NaN;
    const found = D().SHOT_MODES.find((m) => m.value === n);
    return found ? found.value : 1;
  }

  /* Baca satu field per-klip (shot<n>_<key>); kembalikan def bila elemennya
     belum ada (panel breakdown belum dirender / mode single shot). */
  function shotField(n, key, def) {
    const el = $('shot' + n + '_' + key);
    return el ? String(el.value) : def;
  }

  /* Susun baris prompt utama dari gabungan field global + field klip. */
  function composePrompt(o) {
    const v = o.v;
    // Dialog memaksa audio "dialogue with room tone" hanya untuk output prompt;
    // nilai audio pilihan pengguna tidak diubah di form.
    const audio = o.dialog ? 'dialogue with room tone' : v.audio;

    const L = [];
    if (o.lead) L.push(o.lead);
    L.push(cap(v.shotSize) + ' at ' + v.angle + ', shot on a ' + v.lens + '.');
    // Subjek yang diakhiri elipsis ("...,") disambung dengan koma, seperti
    // referensi output: "RARA, a beautiful Indonesian woman..., <aksi>".
    const subjJoin = o.subject.endsWith('...') ? ', ' : ' ';
    L.push(cap(o.subject) + (o.action ? subjJoin + o.action : '') + (o.env ? ', set in ' + o.env : '') + '.');
    L.push('Camera: ' + o.movement + '.');
    L.push('Lighting: ' + v.lighting + '. Color grade: ' + v.color + '. Mood: ' + v.mood + '.');
    L.push('Style: ' + v.style + (o.extra ? '. Details: ' + o.extra : '') + '.');
    L.push('Audio: ' + audio + '.');
    if (o.dialog) L.push('Dialogue (spoken in Indonesian): "' + o.dialog + '"');
    L.push('Output: ' + o.duration + ', ' + v.ratio + ', ' + v.resolution + ', ' + v.fps + '.');
    return L.join('\n');
  }

  /* Susun versi ringkas satu baris. */
  function composeCompact(o) {
    const v = o.v;
    return (o.prefix || '') +
      cap(v.shotSize) + ' of ' + o.subject +
      (o.action ? ', ' + o.action : '') +
      (o.env ? ', ' + o.env : '') + ' — ' + o.movement +
      ', ' + v.lighting + ', ' + v.style +
      ', ' + v.color + ', ' + v.ratio + ' ' + o.duration +
      (o.dialog ? ", speaking: '" + o.dialog + "'" : '') + '.';
  }

  /* Bangun daftar prompt per klip untuk mode multi-shot.
     Mengembalikan array {shotNumber, timeRange, prompt, compact}. */
  function buildMultiShot() {
    const st = getState();
    const v = st.sel;
    const mode = getShotMode();
    const subject = st.subject.trim() || 'the main subject';
    const env = st.environment.trim();
    const extra = st.extra.trim();
    const movementOpts = D().SELECTS.movement.opts;
    const shots = [];
    let start = 0;

    for (let n = 1; n <= mode; n++) {
      const action = shotField(n, 'action', '').trim();
      const dialog = shotField(n, 'dialog', '').trim();
      const mv = shotField(n, 'movement', '');
      const movement = movementOpts.includes(mv) ? mv : v.movement;
      const du = shotField(n, 'duration', '');
      const duration = D().SHOT_DURATIONS.includes(du) ? du : '15s';
      const range = start + '-' + (start + CLIP_SECONDS) + 's';
      const args = { v, subject, action, env, extra, dialog, movement, duration };

      shots.push({
        shotNumber: n,
        timeRange: range,
        prompt: composePrompt({ ...args, lead: n > 1 ? CONTINUITY_CUE : '' }),
        compact: composeCompact({ ...args, prefix: 'Shot ' + n + ' (' + range + '): ' })
      });
      start += CLIP_SECONDS;
    }
    return shots;
  }

  /* Catatan kontinuitas di bawah daftar klip untuk menyatukan video. */
  function buildContinuityNotes(shots) {
    const subject = getState().subject.trim() || 'the main subject';
    const who = subject.split(',')[0].trim() || subject;
    const L = [
      '=== CONTINUITY NOTES ===',
      '',
      'Use the SAME reference image of ' + who + ' for all shots.',
      ''
    ];
    for (let i = 1; i < shots.length; i++) {
      L.push('Extract the LAST FRAME of SHOT ' + i + ' → upload as reference image for SHOT ' + (i + 1) + '.');
      L.push('');
    }
    L.push('Keep character description, environment, style, lighting identical.', '');
    L.push('Join clips in editor (CapCut) with a 0.2s cross-dissolve or hard cut.');
    return L.join('\n');
  }

  /* Susun prompt utama + versi ringkas dari state form saat ini. */
  function build() {
    const mode = getShotMode();

    if (mode > 1) {
      const shots = buildMultiShot();
      $('output').value =
        shots.map((s) => '=== SHOT ' + s.shotNumber + ' (' + s.timeRange + ') ===\n' + s.prompt).join('\n\n') +
        '\n\n' + buildContinuityNotes(shots);
      $('compact').value = shots.map((s) => s.compact).join('\n');
      updateCounter();
      return;
    }

    const st = getState();
    const v = st.sel;

    const subject = st.subject.trim() || 'the main subject';
    const action = st.action.trim();
    const env = st.environment.trim();
    const extra = st.extra.trim();
    const dialog = st.dialog.trim();
    const args = { v, subject, action, env, extra, dialog, movement: v.movement, duration: v.duration, lead: '', prefix: '' };

    $('output').value = composePrompt(args);
    $('compact').value = composeCompact(args);

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
    getShotMode, buildMultiShot,
    encodeState, decodeState, buildShareUrl,
    exportPayload
  };
})();
