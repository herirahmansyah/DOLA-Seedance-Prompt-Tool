/* ==========================================================================
 * presets.js — data statis aplikasi (tanpa logika)
 * Berisi: SELECTS (opsi dropdown), ORDER (urutan field), PRESETS (preset
 * bawaan), RAND (bank acak), DEFAULT_NEG, serta konstanta penyimpanan.
 * Pola modul: IIFE yang hanya menempelkan satu namespace global `window.DOLA`.
 * Urutan load: presets.js -> generator.js -> main.js
 * ========================================================================== */
(function () {
  'use strict';

  // Namespace tunggal agar tidak ada bentrok variabel global.
  window.DOLA = window.DOLA || {};

  /* Daftar opsi setiap dropdown konfigurasi. */
  const SELECTS = {
    shotSize: { label: 'Shot Size', opts: ['extreme close-up', 'close-up', 'medium close-up', 'medium shot', 'medium wide shot', 'wide shot', 'extreme wide shot', 'aerial shot', 'over-the-shoulder shot'] },
    angle: { label: 'Camera Angle', opts: ['eye-level', 'low angle', 'high angle', "bird's-eye view", "worm's-eye view", 'dutch angle', 'overhead top-down'] },
    lens: { label: 'Lens / Optics', opts: ['24mm wide lens', '35mm lens', '50mm lens', '85mm portrait lens', '100mm macro lens', 'anamorphic lens with subtle flare', 'fisheye lens', 'shallow depth of field'] },
    movement: { label: 'Camera Movement', opts: ['static locked-off shot', 'slow push in', 'dolly out', 'pan left to right', 'tilt up', 'tracking shot following the subject', 'orbit around the subject', 'handheld follow', 'crane up', 'slow zoom in', 'drone flyover', 'whip pan'] },
    lighting: { label: 'Lighting', opts: ['soft diffused daylight', 'golden hour backlight', 'harsh noon sunlight', 'moody low-key lighting', 'neon rim lighting', 'warm candlelight', 'studio three-point lighting', 'overcast soft light', 'volumetric god rays', 'bioluminescent glow'] },
    color: { label: 'Color Grade', opts: ['warm teal and orange', 'cool desaturated blue', 'vibrant saturated pop', 'soft pastel palette', 'monochrome with a single accent color', 'earthy natural tones', 'high-contrast black and white'] },
    style: { label: 'Visual Style', opts: ['photorealistic cinematic film', 'documentary realism', 'anime cel-shaded', '3D animated feature style', 'claymation stop-motion', 'vintage 16mm film grain', 'cyberpunk sci-fi', 'watercolor illustration', 'hyperreal product commercial', 'retro VHS aesthetic'] },
    mood: { label: 'Mood', opts: ['serene and calm', 'tense and suspenseful', 'joyful and energetic', 'melancholic and quiet', 'epic and heroic', 'dreamy and ethereal', 'gritty and raw'] },
    audio: { label: 'Audio', opts: ['no audio', 'ambient nature sound', 'city ambience', 'cinematic orchestral score', 'dialogue with room tone', 'foley-driven sound design', 'lo-fi ambient hum'] },
    duration: { label: 'Duration', opts: ['3s', '5s', '8s', '10s', '12s'] },
    ratio: { label: 'Aspect Ratio', opts: ['16:9', '9:16', '1:1', '4:3', '21:9'] },
    resolution: { label: 'Resolution', opts: ['720p', '1080p', '2K', '4K'] },
    fps: { label: 'Frame Rate', opts: ['24fps', '25fps', '30fps', '60fps'] }
  };

  /* Urutan field saat dibangun di grid dan saat state diserialisasi. */
  const ORDER = ['shotSize', 'angle', 'lens', 'movement', 'lighting', 'color', 'style', 'mood', 'audio', 'duration', 'ratio', 'resolution', 'fps'];

  /* Negative prompt bawaan (dipakai saat reset / load state tanpa negative). */
  const DEFAULT_NEG = 'blurry, low resolution, distorted anatomy, extra fingers, extra limbs, warped face, watermark, logo, text overlay, subtitles, jittery motion, flickering frames, oversaturated colors, plastic skin, duplicated subject';

  /* Bank kata acak untuk tombol Randomize. */
  const RAND = {
    subject: ['a lone astronaut', 'a young woman in a red raincoat', 'an elderly fisherman', 'a street food vendor', 'a cyberpunk courier on a hoverbike', 'a white wolf', 'a ballerina in a dusty studio', 'a chef plating a dessert', 'a child with a paper airplane', 'a samurai standing in the rain'],
    action: ['walks slowly toward the camera', 'turns their head to look directly at the lens', 'reaches out and touches the surface', 'spins around mid-air', 'sits still while the wind moves their hair', 'lifts a cup and takes a sip', 'runs through the crowd', 'opens a door and steps into the light'],
    environment: ['a neon-lit alley in Tokyo at night', 'a foggy mountain ridge at sunrise', 'an abandoned factory with light beams through broken windows', 'a minimalist white studio', 'a rain-soaked city street at golden hour', 'a bioluminescent forest at midnight', 'a rooftop overlooking a sprawling megacity', 'a quiet kitchen with morning light'],
    extra: ['wet asphalt reflections', 'floating dust particles in the light', 'steam rising slowly', 'shallow depth of field with creamy bokeh', 'subtle film grain', 'slow-motion rain droplets', 'lens flare across the frame']
  };

  /* Preset gaya bawaan (read-only). Preset custom disimpan terpisah di localStorage. */
  const PRESETS = {
    'Cinematic Drama': { subject: 'an elderly man in a worn leather jacket', action: 'stands still, staring at the horizon as wind moves his coat', environment: 'a rooftop above a rainy city at dusk', shotSize: 'medium shot', angle: 'low angle', lens: '85mm portrait lens', movement: 'slow push in', lighting: 'golden hour backlight', color: 'warm teal and orange', style: 'photorealistic cinematic film', mood: 'melancholic and quiet', audio: 'cinematic orchestral score', duration: '8s', ratio: '21:9', resolution: '4K', fps: '24fps', extra: 'rain droplets, wet asphalt reflections' },
    'Product Commercial': { subject: 'a sleek matte-black wireless earbud case', action: 'rotates slowly on a reflective pedestal', environment: 'an infinite dark studio with gradient background', shotSize: 'extreme close-up', angle: 'eye-level', lens: '100mm macro lens', movement: 'orbit around the subject', lighting: 'studio three-point lighting', color: 'monochrome with a single accent color', style: 'hyperreal product commercial', mood: 'serene and calm', audio: 'foley-driven sound design', duration: '5s', ratio: '16:9', resolution: '4K', fps: '30fps', extra: 'clean specular highlights, glossy reflections' },
    'Anime Action': { subject: 'a teenage swordsman with silver hair', action: 'unsheathes the blade and lunges forward', environment: 'a rooftop under a stormy purple sky', shotSize: 'medium wide shot', angle: 'dutch angle', lens: '35mm lens', movement: 'whip pan', lighting: 'neon rim lighting', color: 'vibrant saturated pop', style: 'anime cel-shaded', mood: 'epic and heroic', audio: 'cinematic orchestral score', duration: '5s', ratio: '16:9', resolution: '1080p', fps: '24fps', extra: 'speed lines, glowing energy trails, dramatic impact frames' },
    'Nature Documentary': { subject: 'a snow leopard', action: 'creeps carefully along a rocky ridge', environment: 'a foggy Himalayan mountain slope at dawn', shotSize: 'wide shot', angle: 'eye-level', lens: '100mm macro lens', movement: 'tracking shot following the subject', lighting: 'overcast soft light', color: 'earthy natural tones', style: 'documentary realism', mood: 'serene and calm', audio: 'ambient nature sound', duration: '10s', ratio: '16:9', resolution: '4K', fps: '25fps', extra: 'cold blue mist, fine fur detail' },
    'Cyberpunk Night': { subject: 'a female courier with chrome implants', action: 'rides a hoverbike through traffic', environment: 'a rain-drenched neon megacity street', shotSize: 'medium wide shot', angle: 'low angle', lens: 'anamorphic lens with subtle flare', movement: 'drone flyover', lighting: 'neon rim lighting', color: 'cool desaturated blue', style: 'cyberpunk sci-fi', mood: 'tense and suspenseful', audio: 'city ambience', duration: '8s', ratio: '21:9', resolution: '4K', fps: '24fps', extra: 'rain streaks, holographic billboards, motion blur' },
    'Food & Beverage': { subject: 'a chef', action: 'pours hot sauce over a steaming plate of noodles', environment: 'a rustic kitchen with warm hanging lamps', shotSize: 'close-up', angle: 'high angle', lens: '50mm lens', movement: 'static locked-off shot', lighting: 'warm candlelight', color: 'warm teal and orange', style: 'photorealistic cinematic film', mood: 'joyful and energetic', audio: 'foley-driven sound design', duration: '5s', ratio: '9:16', resolution: '1080p', fps: '60fps', extra: 'steam rising, glistening sauce texture, shallow depth of field' },
    'Fashion Editorial': { subject: 'a model in a flowing silk gown', action: 'walks slowly while the fabric trails behind', environment: 'a minimalist white studio with a giant fan', shotSize: 'medium shot', angle: 'eye-level', lens: '85mm portrait lens', movement: 'dolly out', lighting: 'soft diffused daylight', color: 'soft pastel palette', style: 'photorealistic cinematic film', mood: 'dreamy and ethereal', audio: 'cinematic orchestral score', duration: '8s', ratio: '9:16', resolution: '4K', fps: '24fps', extra: 'fabric flowing in slow motion, clean background' }
  };

  /* Key localStorage ditempatkan di sini agar mudah diganti/versioning. */
  const STORAGE = {
    history: 'dola.history.v1',
    presets: 'dola.presets.v1'
  };

  /* Batas entri history yang disimpan. */
  const HISTORY_MAX = 20;

  /* Batas ukuran file JSON yang diimpor (byte). */
  const IMPORT_MAX_BYTES = 200 * 1024;

  window.DOLA.data = { SELECTS, ORDER, PRESETS, RAND, DEFAULT_NEG, STORAGE, HISTORY_MAX, IMPORT_MAX_BYTES };
})();
