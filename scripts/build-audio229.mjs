// Procedural Thai Folk-Mystic Audio Synthesizer & Mastering Pipeline (r229)
// Generates all 117 combat SFX (assets/audio-combat/*.mp3), 19 general SFX (assets/audio180/sfx-*.mp3),
// and 9 full-length looping stereo BGM tracks (assets/audio180/bgm-*.mp3).
import {spawnSync} from 'node:child_process';
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BGM,COMBAT_CLASSES,COMBAT_FAMILIES,combatFile} from '../audio-catalog180.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outCombat = path.join(root, 'assets', 'audio-combat');
const outAudio180 = path.join(root, 'assets', 'audio180');
const tmp = path.join(tmpdir(), 'ayothaya-audio229');
mkdirSync(outCombat, {recursive: true});
mkdirSync(outAudio180, {recursive: true});
mkdirSync(tmp, {recursive: true});

const SR = 44100;
const TAU = Math.PI * 2;

// Deterministic PRNG for reproducible synthesis
let seed = 0x9e3779b9;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

// Write stereo or mono Float32 buffer to 16-bit PCM WAV and encode to MP3 via ffmpeg
function encodeMp3(outPath, left, right = null, bitrate = '128k', normalizePeak = 0.92) {
  const channels = right ? 2 : 1;
  const len = left.length;
  let peak = 1e-6;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(left[i]);
    if (a > peak) peak = a;
    if (right) {
      const b = Math.abs(right[i]);
      if (b > peak) peak = b;
    }
  }
  const scale = normalizePeak / peak;
  const dataSize = len * channels * 2;
  const buf = Buffer.allocUnsafe(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < len; i++) {
    const l = Math.max(-1, Math.min(1, Math.tanh(left[i] * scale * 1.15)));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    offset += 2;
    if (right) {
      const r = Math.max(-1, Math.min(1, Math.tanh(right[i] * scale * 1.15)));
      buf.writeInt16LE(Math.round(r * 32767), offset);
      offset += 2;
    }
  }

  const wavPath = path.join(tmp, path.basename(outPath, '.mp3') + '.wav');
  writeFileSync(wavPath, buf);
  const res = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', wavPath,
    '-ar', String(SR),
    '-ac', String(channels),
    '-codec:a', 'libmp3lame',
    '-b:a', bitrate,
    outPath
  ], {encoding: 'utf8'});
  rmSync(wavPath, {force: true});
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${outPath}: ${res.stderr}`);
}

// ---- DSP Building Blocks ----
function makeBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

// State-variable filter (lowpass, bandpass, highpass)
function svfFilter(input, freqFn, q = 1.4, mode = 'bp') {
  const out = new Float32Array(input.length);
  let low = 0, band = 0;
  for (let i = 0; i < input.length; i++) {
    const t = i / SR;
    const fc = Math.max(30, Math.min(16000, typeof freqFn === 'function' ? freqFn(t, i / input.length) : freqFn));
    const f = 2 * Math.sin(Math.PI * fc / SR);
    const damp = Math.min(1.9, 1 / Math.max(0.5, q));
    low += f * band;
    const high = input[i] - low - damp * band;
    band += f * high;
    out[i] = mode === 'lp' ? low : mode === 'hp' ? high : band;
  }
  return out;
}

function addInto(target, src, delaySec = 0, gain = 1) {
  const start = Math.max(0, Math.round(delaySec * SR));
  const end = Math.min(target.length, start + src.length);
  for (let i = start; i < end; i++) {
    target[i] += src[i - start] * gain;
  }
}

// Doppler air-cut whoosh with pitch trajectory and dual formants
function synthWhoosh(dur, fStart, fPeak, fEnd, q = 2.2, sharpness = 1.0) {
  const n = makeBuffer(dur);
  for (let i = 0; i < n.length; i++) n[i] = rand();
  const bp1 = svfFilter(n, (_, u) => {
    const curve = u < 0.38 ? fStart + (fPeak - fStart) * (u / 0.38) : fPeak + (fEnd - fPeak) * ((u - 0.38) / 0.62);
    return curve;
  }, q, 'bp');
  const bp2 = svfFilter(n, (_, u) => {
    const curve = u < 0.38 ? fStart + (fPeak - fStart) * (u / 0.38) : fPeak + (fEnd - fPeak) * ((u - 0.38) / 0.62);
    return curve * 1.85;
  }, q * 1.3, 'bp');
  const out = makeBuffer(dur);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const env = Math.pow(Math.sin(Math.PI * u), 1.35) * Math.exp(-u * 1.4 * sharpness);
    out[i] = (bp1[i] * 0.75 + bp2[i] * 0.45) * env * 2.2;
  }
  return out;
}

// Metallic blade / spear / shield FM + inharmonic modal bank
function synthMetalBlade(dur, baseFreq = 920, brightness = 1.0, scrape = 0.5) {
  const out = makeBuffer(dur);
  const ratios = [1, 1.47, 2.09, 2.84, 3.67, 4.58, 5.79];
  const weights = [0.9, 0.75, 0.6, 0.45, 0.35, 0.25, 0.18];
  let phaseMod = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const attack = Math.min(1, t / 0.0025);
    let sum = 0;
    phaseMod += (TAU * baseFreq * 1.414) / SR;
    const mod = Math.sin(phaseMod) * 1.8 * brightness * Math.exp(-t * 28);
    for (let k = 0; k < ratios.length; k++) {
      const f = baseFreq * ratios[k] * (1 + 0.015 * Math.exp(-t * 45));
      const decay = Math.exp(-t * (8 + k * 6.5) / brightness);
      sum += weights[k] * Math.sin(TAU * f * t + mod * (1 + k * 0.25)) * decay;
    }
    const edgeNoise = scrape * rand() * Math.exp(-t * 65) * Math.sin(TAU * (baseFreq * 2.3) * t);
    out[i] = (sum * 0.42 + edgeNoise) * attack;
  }
  return out;
}

// Heavy physical impact (sub-bass pitch drop + crunch transient + body thud)
function synthImpact(dur, startFreq = 155, endFreq = 42, punch = 1.0, crunch = 0.6) {
  const out = makeBuffer(dur);
  let phase = 0;
  const noise = makeBuffer(dur);
  for (let i = 0; i < noise.length; i++) noise[i] = rand();
  const bodyNoise = svfFilter(noise, (_, u) => 900 * Math.exp(-u * 3.5) + 120, 1.3, 'bp');
  const snapNoise = svfFilter(noise, 2600, 1.8, 'bp');

  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = endFreq + (startFreq - endFreq) * Math.exp(-t * 26);
    phase += (TAU * f) / SR;
    const sub = Math.sin(phase) * Math.exp(-t * 8.5) * punch;
    const harmonic = Math.sin(phase * 2.1) * Math.exp(-t * 18) * 0.45 * punch;
    const snap = snapNoise[i] * Math.exp(-t * 95) * 1.4 * crunch;
    const thud = bodyNoise[i] * Math.exp(-t * 22) * 0.9 * crunch;
    out[i] = Math.tanh((sub + harmonic + snap + thud) * 1.4);
  }
  return out;
}

// Karplus-Strong plucked string / bowstring twang with body resonance
function synthBowTwang(dur, freq = 185, tension = 0.992, woodSnap = 0.8) {
  const out = makeBuffer(dur);
  const period = Math.max(8, Math.round(SR / freq));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    ring[i] = rand() * (1 - i / period * 0.3) + 0.4 * Math.sin((TAU * i) / period);
  }
  let idx = 0, prev = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const cur = ring[idx];
    const next = ((cur + prev) * 0.5) * tension;
    prev = cur;
    ring[idx] = next;
    idx = (idx + 1) % period;
    // Slight pitch bend after release (bow limb recoil)
    const recoil = Math.sin(TAU * freq * (1 - 0.14 * Math.exp(-t * 18)) * t) * Math.exp(-t * 11) * 0.55;
    const snap = woodSnap * rand() * Math.exp(-t * 140) * (1 + 0.8 * Math.sin(TAU * 1450 * t));
    out[i] = cur * 0.65 + recoil + snap;
  }
  return out;
}

// Thai Temple Bell / Singing Bowl / Chime
function synthChime(dur, freq = 880, shimmer = 1.0) {
  const out = makeBuffer(dur);
  const partials = [1, 2.0, 2.756, 4.07, 5.404];
  const amps = [1.0, 0.55, 0.42, 0.25, 0.16];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.003);
    let s = 0;
    for (let k = 0; k < partials.length; k++) {
      const f = freq * partials[k];
      const beat = 1 + 0.003 * k * shimmer * Math.sin(TAU * (3.5 + k * 1.7) * t);
      s += amps[k] * Math.sin(TAU * f * beat * t) * Math.exp(-t * (2.2 + k * 1.9));
    }
    const strike = rand() * Math.exp(-t * 130) * 0.25;
    out[i] = (s * 0.45 + strike) * env;
  }
  return out;
}

// Fire / Talisman crackle + ember sizzle
function synthCrackle(dur, density = 0.96, tone = 2400) {
  const raw = makeBuffer(dur);
  let hold = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SR;
    if (Math.abs(rand()) > density) hold = rand() * 2.2;
    hold *= 0.92;
    raw[i] = (hold + rand() * 0.18) * Math.exp(-t * 3.8);
  }
  return svfFilter(raw, tone, 1.5, 'bp');
}

// Multi-tap stereo/mono echo for spaciousness
function applyEcho(buf, delays = [0.065, 0.135], gains = [0.28, 0.15]) {
  const extra = Math.ceil(Math.max(...delays, 0) * SR);
  const out = new Float32Array(buf.length + extra);
  out.set(buf);
  for (let d = 0; d < delays.length; d++) {
    const offset = Math.round(delays[d] * SR);
    const g = gains[d];
    for (let i = 0; i < buf.length; i++) {
      out[i + offset] += buf[i] * g;
    }
  }
  return out;
}

// ---- 1. Render All 7 Classes Combat SFX (swing0..2, hit0..2, ult0) ----
function buildClassSounds() {
  for (const c of COMBAT_CLASSES) {
    for (const v of [0, 1, 2]) {
      const p = [1.0, 0.93, 1.08][v];
      // SWING
      let swing = makeBuffer(0.42);
      if (c === 'swordsman') {
        addInto(swing, synthWhoosh(0.28, 650 * p, 2600 * p, 480 * p, 2.0, 1.1), 0, 0.95);
        addInto(swing, synthMetalBlade(0.32, 1180 * p, 1.15, 0.6), 0.015, 0.72);
        addInto(swing, synthImpact(0.16, 180 * p, 65, 0.45, 0.3), 0.01, 0.4);
      } else if (c === 'lancer') {
        addInto(swing, synthWhoosh(0.34, 340 * p, 1450 * p, 290 * p, 1.8, 0.95), 0, 1.0);
        addInto(swing, synthMetalBlade(0.28, 860 * p, 0.95, 0.5), 0.03, 0.65);
        addInto(swing, synthImpact(0.22, 135 * p, 48, 0.6, 0.35), 0.02, 0.55);
      } else if (c === 'hunter') {
        addInto(swing, synthBowTwang(0.36, 215 * p, 0.993, 0.9), 0, 0.95);
        addInto(swing, synthWhoosh(0.24, 1800 * p, 4200 * p, 1200 * p, 2.6, 1.3), 0.025, 0.75);
      } else if (c === 'boxer') {
        addInto(swing, synthWhoosh(0.22, 420 * p, 1250 * p, 320 * p, 1.6, 1.3), 0, 0.95);
        addInto(swing, synthImpact(0.20, 145 * p, 52, 0.75, 0.55), 0.015, 0.75);
      } else if (c === 'rogue') {
        addInto(swing, synthWhoosh(0.18, 1200 * p, 3800 * p, 900 * p, 2.4, 1.4), 0, 0.85);
        addInto(swing, synthMetalBlade(0.22, 1680 * p, 1.3, 0.7), 0.008, 0.75);
        addInto(swing, synthMetalBlade(0.20, 1960 * p, 1.25, 0.6), 0.075, 0.55);
      } else if (c === 'shaman') {
        addInto(swing, synthWhoosh(0.34, 520 * p, 1650 * p, 420 * p, 2.2, 0.9), 0, 0.8);
        addInto(swing, synthCrackle(0.32, 0.94, 2200 * p), 0.02, 0.75);
        addInto(swing, synthChime(0.36, 528 * p, 1.4), 0.03, 0.45);
      } else if (c === 'acolyte') {
        addInto(swing, synthWhoosh(0.32, 600 * p, 1800 * p, 520 * p, 2.0, 0.95), 0, 0.7);
        addInto(swing, synthChime(0.38, 1046.5 * p, 0.8), 0.015, 0.75);
        addInto(swing, synthChime(0.36, 1318.5 * p, 0.8), 0.055, 0.5);
      }
      encodeMp3(path.join(outCombat, combatFile('cls', c, 'swing', v) + '.mp3'), swing, null, '96k', 0.9);

      // HIT
      let hit = makeBuffer(0.48);
      if (c === 'swordsman') {
        addInto(hit, synthImpact(0.36, 170 * p, 45, 1.0, 0.85), 0, 0.95);
        addInto(hit, synthMetalBlade(0.34, 1320 * p, 1.2, 0.85), 0.005, 0.85);
        addInto(hit, synthWhoosh(0.20, 2800 * p, 900 * p, 350 * p, 1.9, 1.3), 0.01, 0.6);
      } else if (c === 'lancer') {
        addInto(hit, synthImpact(0.42, 150 * p, 38, 1.15, 0.9), 0, 1.0);
        addInto(hit, synthMetalBlade(0.32, 980 * p, 1.05, 0.8), 0.008, 0.8);
        addInto(hit, synthBowTwang(0.28, 140 * p, 0.97, 0.9), 0.015, 0.55);
      } else if (c === 'hunter') {
        addInto(hit, synthImpact(0.30, 210 * p, 58, 0.85, 0.95), 0, 0.95);
        addInto(hit, synthBowTwang(0.25, 320 * p, 0.96, 1.1), 0.005, 0.8);
        addInto(hit, synthWhoosh(0.16, 3400 * p, 1100 * p, 500 * p, 2.2, 1.5), 0, 0.55);
      } else if (c === 'boxer') {
        addInto(hit, synthImpact(0.40, 165 * p, 36, 1.25, 1.0), 0, 1.05);
        addInto(hit, synthImpact(0.24, 340 * p, 85, 0.8, 1.1), 0.006, 0.75);
      } else if (c === 'rogue') {
        addInto(hit, synthImpact(0.28, 195 * p, 52, 0.85, 0.9), 0, 0.85);
        addInto(hit, synthMetalBlade(0.24, 1750 * p, 1.3, 0.9), 0, 0.85);
        addInto(hit, synthMetalBlade(0.24, 2120 * p, 1.35, 0.85), 0.065, 0.78);
        addInto(hit, synthImpact(0.24, 180 * p, 48, 0.75, 0.8), 0.065, 0.7);
      } else if (c === 'shaman') {
        addInto(hit, synthImpact(0.38, 140 * p, 42, 0.9, 0.7), 0, 0.85);
        addInto(hit, synthCrackle(0.36, 0.92, 2600 * p), 0.005, 0.9);
        addInto(hit, synthChime(0.42, 440 * p, 1.6), 0.01, 0.65);
      } else if (c === 'acolyte') {
        addInto(hit, synthImpact(0.34, 155 * p, 48, 0.8, 0.55), 0, 0.75);
        addInto(hit, synthChime(0.44, 880 * p, 0.9), 0, 0.85);
        addInto(hit, synthChime(0.42, 1320 * p, 0.9), 0.03, 0.65);
      }
      encodeMp3(path.join(outCombat, combatFile('cls', c, 'hit', v) + '.mp3'), hit, null, '96k', 0.92);
    }

    // ULTIMATE STING (ult0)
    let ult = makeBuffer(1.25);
    addInto(ult, synthImpact(0.85, 130, 32, 1.3, 0.9), 0, 1.0);
    if (c === 'swordsman') {
      addInto(ult, synthMetalBlade(0.75, 1046.5, 1.3, 0.9), 0.02, 0.9);
      addInto(ult, synthMetalBlade(0.70, 1568, 1.25, 0.7), 0.11, 0.75);
      addInto(ult, synthChime(0.95, 523.25, 0.8), 0.05, 0.65);
    } else if (c === 'lancer') {
      addInto(ult, synthWhoosh(0.55, 300, 1900, 260, 2.0, 0.85), 0, 0.95);
      addInto(ult, synthMetalBlade(0.75, 784, 1.2, 0.85), 0.05, 0.9);
      addInto(ult, synthImpact(0.70, 110, 30, 1.2, 0.85), 0.14, 0.85);
    } else if (c === 'hunter') {
      addInto(ult, synthBowTwang(0.45, 165, 0.994, 1.0), 0, 0.95);
      addInto(ult, synthBowTwang(0.45, 220, 0.994, 0.9), 0.07, 0.85);
      addInto(ult, synthBowTwang(0.45, 293.66, 0.994, 0.9), 0.14, 0.85);
      addInto(ult, synthWhoosh(0.50, 1400, 4600, 900, 2.4, 0.9), 0.08, 0.85);
    } else if (c === 'boxer') {
      addInto(ult, synthChime(0.75, 659.25, 0.7), 0, 0.7);
      addInto(ult, synthImpact(0.45, 160, 38, 1.25, 1.0), 0.08, 0.95);
      addInto(ult, synthImpact(0.55, 140, 30, 1.4, 1.1), 0.20, 1.1);
    } else if (c === 'rogue') {
      addInto(ult, synthWhoosh(0.48, 2400, 380, 180, 2.2, 0.9), 0, 0.9);
      addInto(ult, synthMetalBlade(0.50, 1568, 1.35, 0.9), 0.12, 0.85);
      addInto(ult, synthMetalBlade(0.55, 2093, 1.4, 0.9), 0.22, 0.85);
    } else if (c === 'shaman') {
      addInto(ult, synthChime(1.0, 293.66, 1.6), 0, 0.85);
      addInto(ult, synthChime(0.95, 440, 1.6), 0.08, 0.75);
      addInto(ult, synthCrackle(0.85, 0.91, 2100), 0.04, 0.9);
    } else if (c === 'acolyte') {
      for (const [idx, f] of [523.25, 659.25, 783.99, 1046.5].entries()) {
        addInto(ult, synthChime(1.0, f, 0.7), idx * 0.06, 0.7);
      }
    }
    ult = applyEcho(ult, [0.08, 0.17], [0.26, 0.14]);
    encodeMp3(path.join(outCombat, combatFile('cls', c, 'ult', 0) + '.mp3'), ult, null, '96k', 0.92);
  }
}

// ---- 2. Render All 17 Skill Families (fam-<family>-cast0..1, fam-<family>-hit0..1) ----
function buildFamilySounds() {
  for (const f of COMBAT_FAMILIES) {
    for (const v of [0, 1]) {
      const p = v === 0 ? 1.0 : 1.09;
      let cast = makeBuffer(0.62);
      let hit = makeBuffer(0.68);

      switch (f) {
        case 'fist':
          addInto(cast, synthWhoosh(0.28, 380 * p, 1350 * p, 300 * p, 1.7, 1.1), 0, 0.95);
          addInto(cast, synthImpact(0.22, 130 * p, 48, 0.7, 0.5), 0.03, 0.65);
          addInto(hit, synthImpact(0.45, 175 * p, 34, 1.3, 1.05), 0, 1.0);
          addInto(hit, synthImpact(0.32, 220 * p, 52, 0.95, 0.95), 0.07, 0.85);
          break;
        case 'sword':
          addInto(cast, synthMetalBlade(0.38, 1240 * p, 1.25, 0.75), 0, 0.9);
          addInto(cast, synthWhoosh(0.32, 700 * p, 2900 * p, 520 * p, 2.1, 1.0), 0.02, 0.9);
          addInto(hit, synthImpact(0.42, 165 * p, 42, 1.1, 0.9), 0, 0.95);
          addInto(hit, synthMetalBlade(0.40, 1420 * p, 1.3, 0.9), 0.005, 0.9);
          addInto(hit, synthMetalBlade(0.34, 1780 * p, 1.2, 0.75), 0.06, 0.7);
          break;
        case 'lance':
          addInto(cast, synthWhoosh(0.38, 320 * p, 1550 * p, 280 * p, 1.8, 0.95), 0, 0.95);
          addInto(cast, synthMetalBlade(0.34, 890 * p, 1.05, 0.6), 0.03, 0.75);
          addInto(hit, synthImpact(0.46, 150 * p, 35, 1.25, 0.95), 0, 1.0);
          addInto(hit, synthMetalBlade(0.36, 1020 * p, 1.15, 0.85), 0.008, 0.85);
          addInto(hit, synthBowTwang(0.30, 130 * p, 0.97, 0.8), 0.02, 0.6);
          break;
        case 'arrow':
          addInto(cast, synthBowTwang(0.38, 225 * p, 0.993, 0.95), 0, 0.95);
          addInto(cast, synthWhoosh(0.28, 1900 * p, 4400 * p, 1300 * p, 2.5, 1.2), 0.03, 0.8);
          addInto(hit, synthImpact(0.34, 215 * p, 55, 0.95, 1.0), 0, 0.95);
          addInto(hit, synthBowTwang(0.26, 340 * p, 0.96, 1.1), 0.006, 0.8);
          addInto(hit, synthImpact(0.28, 240 * p, 62, 0.75, 0.9), 0.075, 0.7);
          break;
        case 'shield':
          addInto(cast, synthMetalBlade(0.42, 620 * p, 0.9, 0.5), 0, 0.85);
          addInto(cast, synthImpact(0.30, 140 * p, 45, 0.8, 0.6), 0.01, 0.75);
          addInto(hit, synthImpact(0.48, 155 * p, 36, 1.2, 0.9), 0, 1.0);
          addInto(hit, synthMetalBlade(0.46, 740 * p, 1.1, 0.85), 0.005, 0.95);
          addInto(hit, synthChime(0.42, 587.33 * p, 0.6), 0.02, 0.55);
          break;
        case 'dust':
          addInto(cast, synthWhoosh(0.42, 220 * p, 720 * p, 180 * p, 1.4, 0.85), 0, 0.95);
          addInto(cast, synthCrackle(0.38, 0.93, 950 * p), 0.03, 0.7);
          addInto(hit, synthImpact(0.52, 125 * p, 30, 1.35, 1.0), 0, 1.0);
          addInto(hit, synthCrackle(0.42, 0.91, 1100 * p), 0.02, 0.8);
          break;
        case 'banner':
          addInto(cast, synthWhoosh(0.36, 360 * p, 1100 * p, 420 * p, 1.6, 0.95), 0, 0.85);
          addInto(cast, synthChime(0.50, 392 * p, 0.7), 0.05, 0.75);
          addInto(hit, synthImpact(0.54, 115 * p, 32, 1.3, 0.85), 0, 1.0);
          addInto(hit, synthChime(0.56, 523.25 * p, 0.85), 0.02, 0.8);
          addInto(hit, synthChime(0.52, 783.99 * p, 0.85), 0.08, 0.65);
          break;
        case 'shadow':
          addInto(cast, synthWhoosh(0.44, 1800 * p, 420 * p, 190 * p, 2.3, 0.9), 0, 0.95);
          addInto(cast, synthMetalBlade(0.30, 1520 * p, 1.2, 0.65), 0.05, 0.65);
          addInto(hit, synthImpact(0.42, 150 * p, 36, 1.1, 0.9), 0, 0.95);
          addInto(hit, synthMetalBlade(0.32, 1840 * p, 1.35, 0.9), 0.005, 0.85);
          addInto(hit, synthWhoosh(0.34, 950 * p, 280 * p, 140 * p, 2.0, 1.0), 0.03, 0.75);
          cast = applyEcho(cast, [0.07, 0.14], [0.28, 0.15]);
          hit = applyEcho(hit, [0.07, 0.14], [0.28, 0.15]);
          break;
        case 'holy':
          addInto(cast, synthChime(0.55, 880 * p, 0.85), 0, 0.8);
          addInto(cast, synthChime(0.52, 1174.66 * p, 0.85), 0.07, 0.75);
          addInto(cast, synthChime(0.48, 1318.5 * p, 0.85), 0.14, 0.7);
          addInto(hit, synthChime(0.58, 1046.5 * p, 0.9), 0, 0.85);
          addInto(hit, synthChime(0.54, 1567.98 * p, 0.9), 0.05, 0.8);
          addInto(hit, synthImpact(0.34, 140 * p, 46, 0.65, 0.4), 0, 0.55);
          cast = applyEcho(cast, [0.08, 0.16], [0.3, 0.18]);
          hit = applyEcho(hit, [0.08, 0.16], [0.3, 0.18]);
          break;
        case 'talisman':
          addInto(cast, synthWhoosh(0.24, 1400 * p, 3200 * p, 1100 * p, 2.2, 1.3), 0, 0.8);
          addInto(cast, synthCrackle(0.42, 0.93, 2500 * p), 0.03, 0.85);
          addInto(cast, synthChime(0.45, 1174.66 * p, 1.1), 0.06, 0.65);
          addInto(hit, synthImpact(0.42, 165 * p, 42, 1.05, 0.9), 0, 0.95);
          addInto(hit, synthCrackle(0.46, 0.9, 2800 * p), 0.01, 0.95);
          addInto(hit, synthChime(0.42, 987.77 * p, 1.3), 0.02, 0.6);
          break;
        case 'spirit':
          addInto(cast, synthWhoosh(0.50, 620 * p, 1950 * p, 480 * p, 2.6, 0.85), 0, 0.85);
          addInto(cast, synthChime(0.52, 659.25 * p, 1.5), 0.05, 0.7);
          addInto(cast, synthChime(0.48, 783.99 * p, 1.5), 0.14, 0.6);
          addInto(hit, synthImpact(0.42, 135 * p, 38, 0.95, 0.75), 0, 0.9);
          addInto(hit, synthWhoosh(0.40, 1800 * p, 580 * p, 260 * p, 2.5, 0.95), 0.01, 0.85);
          addInto(hit, synthChime(0.48, 587.33 * p, 1.6), 0.02, 0.7);
          cast = applyEcho(cast, [0.09, 0.19], [0.32, 0.18]);
          hit = applyEcho(hit, [0.09, 0.19], [0.32, 0.18]);
          break;
        case 'lotus':
          for (const [idx, freq] of [783.99, 987.77, 1174.66, 1567.98].entries()) {
            addInto(cast, synthChime(0.46, freq * p, 0.75), idx * 0.055, 0.68);
          }
          addInto(hit, synthChime(0.56, 1046.5 * p, 0.8), 0, 0.85);
          addInto(hit, synthChime(0.54, 1318.5 * p, 0.8), 0.04, 0.75);
          addInto(hit, synthChime(0.52, 1567.98 * p, 0.8), 0.08, 0.75);
          break;
        case 'venom':
          addInto(cast, synthCrackle(0.44, 0.91, 1450 * p), 0, 0.85);
          addInto(cast, synthWhoosh(0.36, 900 * p, 2600 * p, 700 * p, 2.8, 1.0), 0.02, 0.8);
          addInto(hit, synthImpact(0.36, 155 * p, 46, 0.9, 0.85), 0, 0.9);
          addInto(hit, synthCrackle(0.46, 0.89, 1850 * p), 0.01, 0.95);
          addInto(hit, synthWhoosh(0.34, 3200 * p, 1400 * p, 600 * p, 2.6, 1.1), 0.02, 0.7);
          break;
        case 'vines':
          addInto(cast, synthBowTwang(0.42, 115 * p, 0.985, 1.1), 0, 0.9);
          addInto(cast, synthWhoosh(0.34, 480 * p, 1650 * p, 380 * p, 1.9, 1.0), 0.03, 0.85);
          addInto(hit, synthImpact(0.40, 160 * p, 44, 1.0, 0.95), 0, 0.95);
          addInto(hit, synthBowTwang(0.32, 155 * p, 0.98, 1.2), 0.02, 0.8);
          break;
        case 'rooster':
          addInto(cast, synthWhoosh(0.22, 650 * p, 2200 * p, 780 * p, 1.9, 1.3), 0, 0.85);
          addInto(cast, synthWhoosh(0.22, 780 * p, 2600 * p, 860 * p, 1.9, 1.3), 0.08, 0.85);
          addInto(hit, synthImpact(0.34, 195 * p, 52, 0.95, 0.95), 0, 0.95);
          addInto(hit, synthMetalBlade(0.26, 1620 * p, 1.2, 0.8), 0.01, 0.75);
          break;
        case 'rooster-crow':
          for (const [idx, freq] of [880, 1174.66, 1396.9, 1046.5].entries()) {
            addInto(cast, synthChime(0.26, freq * p, 1.2), idx * 0.075, 0.75);
          }
          addInto(hit, synthImpact(0.38, 175 * p, 45, 1.0, 0.9), 0, 0.9);
          addInto(hit, synthChime(0.42, 1318.5 * p, 1.1), 0.01, 0.8);
          break;
        case 'life-tree':
          for (const [idx, freq] of [523.25, 659.25, 783.99, 1046.5].entries()) {
            addInto(cast, synthChime(0.55, freq * p, 0.7), idx * 0.05, 0.65);
            addInto(hit, synthChime(0.60, freq * 1.25 * p, 0.75), idx * 0.04, 0.7);
          }
          addInto(hit, synthImpact(0.45, 120 * p, 38, 0.8, 0.45), 0, 0.65);
          break;
      }

      encodeMp3(path.join(outCombat, combatFile('fam', f, 'cast', v) + '.mp3'), cast, null, '96k', 0.9);
      encodeMp3(path.join(outCombat, combatFile('fam', f, 'hit', v) + '.mp3'), hit, null, '96k', 0.92);
    }
  }
}

// ---- 3. Render All 19 General SFX in assets/audio180/sfx-*.mp3 ----
function buildGeneralSfx() {
  for (const v of [0, 1, 2]) {
    const p = [1.0, 0.94, 1.07][v];
    const sw = makeBuffer(0.32);
    addInto(sw, synthWhoosh(0.26, 550 * p, 2200 * p, 420 * p, 1.9, 1.1), 0, 0.95);
    addInto(sw, synthMetalBlade(0.24, 1100 * p, 1.0, 0.5), 0.015, 0.55);
    encodeMp3(path.join(outAudio180, `sfx-swing${v}.mp3`), sw, null, '96k', 0.88);

    const ht = makeBuffer(0.38);
    addInto(ht, synthImpact(0.34, 165 * p, 42, 1.05, 0.9), 0, 0.95);
    addInto(ht, synthMetalBlade(0.26, 1240 * p, 1.1, 0.7), 0.005, 0.65);
    encodeMp3(path.join(outAudio180, `sfx-hit${v}.mp3`), ht, null, '96k', 0.92);
  }

  // crit
  const crit = makeBuffer(0.65);
  addInto(crit, synthImpact(0.48, 190, 34, 1.35, 1.05), 0, 1.0);
  addInto(crit, synthMetalBlade(0.45, 1568, 1.35, 0.95), 0.004, 0.9);
  addInto(crit, synthChime(0.55, 1046.5, 0.9), 0.02, 0.75);
  addInto(crit, synthChime(0.52, 1567.98, 0.9), 0.06, 0.7);
  encodeMp3(path.join(outAudio180, 'sfx-crit.mp3'), crit, null, '96k', 0.94);

  // cast
  const cast = makeBuffer(0.55);
  addInto(cast, synthWhoosh(0.36, 650, 2100, 580, 2.2, 1.0), 0, 0.8);
  addInto(cast, synthChime(0.48, 783.99, 0.85), 0.02, 0.75);
  addInto(cast, synthChime(0.45, 1174.66, 0.85), 0.08, 0.7);
  encodeMp3(path.join(outAudio180, 'sfx-cast.mp3'), cast, null, '96k', 0.9);

  // hurt
  const hurt = makeBuffer(0.36);
  addInto(hurt, synthImpact(0.32, 145, 38, 1.1, 0.95), 0, 0.95);
  addInto(hurt, synthWhoosh(0.20, 900, 340, 180, 1.8, 1.2), 0.01, 0.65);
  encodeMp3(path.join(outAudio180, 'sfx-hurt.mp3'), hurt, null, '96k', 0.9);

  // dodge
  const dodge = makeBuffer(0.28);
  addInto(dodge, synthWhoosh(0.24, 900, 3200, 750, 2.3, 1.3), 0, 0.9);
  encodeMp3(path.join(outAudio180, 'sfx-dodge.mp3'), dodge, null, '96k', 0.88);

  // defeat
  const defeat = makeBuffer(0.65);
  addInto(defeat, synthImpact(0.45, 130, 30, 1.1, 0.8), 0, 0.9);
  addInto(defeat, synthWhoosh(0.48, 1400, 420, 160, 2.1, 0.9), 0.04, 0.8);
  addInto(defeat, synthChime(0.52, 587.33, 1.1), 0.08, 0.55);
  encodeMp3(path.join(outAudio180, 'sfx-defeat.mp3'), defeat, null, '96k', 0.9);

  // potion
  const potion = makeBuffer(0.52);
  for (const [idx, freq] of [587.33, 783.99, 987.77, 1174.66, 1567.98].entries()) {
    addInto(potion, synthChime(0.32, freq, 0.7), idx * 0.045, 0.65);
  }
  encodeMp3(path.join(outAudio180, 'sfx-potion.mp3'), potion, null, '96k', 0.88);

  // level
  let level = makeBuffer(1.65);
  const lvNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  lvNotes.forEach((f, idx) => {
    addInto(level, synthChime(0.95, f, 0.75), idx * 0.085, 0.75);
  });
  addInto(level, synthImpact(0.6, 110, 36, 0.85, 0.4), 0, 0.65);
  level = applyEcho(level, [0.09, 0.18], [0.28, 0.16]);
  encodeMp3(path.join(outAudio180, 'sfx-level.mp3'), level, null, '96k', 0.92);

  // fanfare
  let fanfare = makeBuffer(1.85);
  const ffNotes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
  ffNotes.forEach((f, idx) => {
    addInto(fanfare, synthChime(1.05, f, 0.8), idx * 0.09, 0.78);
  });
  addInto(fanfare, synthImpact(0.7, 115, 34, 0.95, 0.5), 0, 0.7);
  addInto(fanfare, synthImpact(0.7, 125, 36, 0.95, 0.5), 0.54, 0.7);
  fanfare = applyEcho(fanfare, [0.1, 0.2], [0.3, 0.18]);
  encodeMp3(path.join(outAudio180, 'sfx-fanfare.mp3'), fanfare, null, '96k', 0.92);

  // chime
  const chime = makeBuffer(0.75);
  addInto(chime, synthChime(0.65, 880, 0.75), 0, 0.8);
  addInto(chime, synthChime(0.65, 1318.5, 0.75), 0.08, 0.85);
  encodeMp3(path.join(outAudio180, 'sfx-chime.mp3'), chime, null, '96k', 0.88);

  // rare
  let rare = makeBuffer(1.1);
  [783.99, 987.77, 1174.66, 1567.98, 1975.5].forEach((f, idx) => {
    addInto(rare, synthChime(0.75, f, 0.85), idx * 0.06, 0.75);
  });
  rare = applyEcho(rare, [0.08, 0.16], [0.28, 0.15]);
  encodeMp3(path.join(outAudio180, 'sfx-rare.mp3'), rare, null, '96k', 0.9);

  // coin
  const coin = makeBuffer(0.38);
  addInto(coin, synthMetalBlade(0.28, 2093, 1.2, 0.3), 0, 0.75);
  addInto(coin, synthChime(0.32, 2637, 0.7), 0.055, 0.85);
  encodeMp3(path.join(outAudio180, 'sfx-coin.mp3'), coin, null, '96k', 0.88);

  // forge
  const forge = makeBuffer(0.68);
  addInto(forge, synthMetalBlade(0.45, 1396.9, 1.3, 0.8), 0, 0.95);
  addInto(forge, synthImpact(0.35, 180, 48, 0.95, 0.85), 0, 0.85);
  addInto(forge, synthMetalBlade(0.42, 1760, 1.3, 0.75), 0.18, 0.85);
  addInto(forge, synthWhoosh(0.32, 3200, 1800, 900, 2.0, 1.1), 0.24, 0.55);
  encodeMp3(path.join(outAudio180, 'sfx-forge.mp3'), forge, null, '96k', 0.92);

  // click
  const click = makeBuffer(0.09);
  addInto(click, synthImpact(0.07, 520, 160, 0.65, 0.5), 0, 0.8);
  addInto(click, synthChime(0.08, 1568, 0.5), 0, 0.45);
  encodeMp3(path.join(outAudio180, 'sfx-click.mp3'), click, null, '96k', 0.75);
}

// ---- 4. Thai Folk-Mystic Instrumental BGM Synthesizer (9 Full-Length Seamless Loops) ----
// Instruments:
// - ranat: Hardwood xylophone mallet strike + warm resonator
// - khong: Bronze bossed gong circle with warm fundamental + bell overtone
// - pi: Thai reed/flute (Pi Nai / Khlui) with expressive vibrato & breath formant
// - sou: Bowed coconut-shell fiddle (So U) with smooth attack & expressive vibrato
// - klong: Traditional Thai drum (Taphon / Klong That / Klong Suek)
// - ching: Crisp bronze finger cymbals (Ching / Chap)
function noteRanat(dur, freq, hard = 1.0) {
  const n = makeBuffer(dur);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.002);
    const f1 = Math.sin(TAU * freq * t) * Math.exp(-t * 9.5);
    const f2 = Math.sin(TAU * freq * 2.98 * t) * Math.exp(-t * 28) * 0.38 * hard;
    const f3 = Math.sin(TAU * freq * 5.85 * t) * Math.exp(-t * 55) * 0.14 * hard;
    const mallet = rand() * Math.exp(-t * 180) * 0.22 * hard;
    n[i] = (f1 + f2 + f3 + mallet) * att;
  }
  return n;
}

function noteKhong(dur, freq) {
  const n = makeBuffer(dur);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.005);
    const f1 = Math.sin(TAU * freq * t) * Math.exp(-t * 3.2);
    const f2 = Math.sin(TAU * freq * 2.0 * t) * Math.exp(-t * 5.5) * 0.42;
    const f3 = Math.sin(TAU * freq * 3.02 * t) * Math.exp(-t * 9.5) * 0.18;
    n[i] = (f1 + f2 + f3) * att;
  }
  return n;
}

function noteWind(dur, freq, reed = false) {
  const n = makeBuffer(dur);
  let phase = 0;
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.06) * Math.min(1, Math.max(0, (dur - t) / 0.08));
    const vib = 1 + 0.009 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / 0.18);
    phase += (TAU * freq * vib) / SR;
    let s = Math.sin(phase) * 0.65 + Math.sin(phase * 2) * (reed ? 0.38 : 0.18) + Math.sin(phase * 3) * (reed ? 0.25 : 0.06);
    if (reed) s += Math.sin(phase * 4) * 0.12;
    const breath = rand() * 0.035;
    n[i] = (s + breath) * env * 0.55;
  }
  return n;
}

function noteSoU(dur, freq) {
  const n = makeBuffer(dur);
  let phase = 0;
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.09) * Math.min(1, Math.max(0, (dur - t) / 0.1));
    const vib = 1 + 0.011 * Math.sin(TAU * 4.8 * t);
    phase += (TAU * freq * vib) / SR;
    const s = Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.32 + Math.sin(phase * 3) * 0.14;
    n[i] = s * env * 0.5;
  }
  return n;
}

function hitDrum(low = 72, punch = 1.0) {
  return synthImpact(0.38, low * 1.9, low, punch, 0.35);
}

function hitChing(open = true) {
  const dur = open ? 0.36 : 0.11;
  const decay = open ? 8.5 : 32;
  const n = makeBuffer(dur);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const s = (Math.sin(TAU * 3520 * t) + 0.65 * Math.sin(TAU * 5180 * t) + 0.4 * Math.sin(TAU * 6890 * t)) * Math.exp(-t * decay);
    n[i] = s * 0.22;
  }
  return n;
}

function renderBgmTrack(id, cfg) {
  const seconds = BGM[id].seconds;
  const tail = 2.0; // extra render tail wrapped around to start for seamless loop
  const totalSec = seconds + tail;
  const L = makeBuffer(totalSec);
  const R = makeBuffer(totalSec);

  const addStereo = (buf, atSec, gain = 1, pan = 0) => {
    if (atSec >= seconds) return;
    const gl = gain * Math.cos((pan + 1) * Math.PI * 0.25);
    const gr = gain * Math.sin((pan + 1) * Math.PI * 0.25);
    addInto(L, buf, atSec, gl);
    addInto(R, buf, atSec, gr);
  };

  const beat = 60 / cfg.bpm;
  const step = beat / 2; // eighth note
  const totalSteps = Math.floor(seconds / step);
  const scale = cfg.scale; // 5-note or 7-note pitch ratios
  const root = cfg.root;

  // Warm ambient drone pad across the whole loop
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const p1 = Math.sin(TAU * (root * 0.5) * t + 0.2 * Math.sin(TAU * 0.12 * t));
    const p2 = Math.sin(TAU * (root * 0.75) * t + 0.2 * Math.cos(TAU * 0.15 * t));
    const p3 = Math.sin(TAU * root * t);
    L[i] += (p1 * 0.55 + p2 * 0.3 + p3 * 0.2) * cfg.padGain;
    R[i] += (p1 * 0.55 + p2 * 0.25 + p3 * 0.25) * cfg.padGain;
  }

  const drumLow = hitDrum(cfg.drumFreq, cfg.drumGain);
  const drumMid = hitDrum(cfg.drumFreq * 1.45, cfg.drumGain * 0.72);
  const chingOpen = hitChing(true);
  const chingClosed = hitChing(false);

  for (let s = 0; s < totalSteps; s++) {
    const t = s * step;
    const barStep = s % 16;
    const phrase = Math.floor(s / 16) % 4;

    // Ching-Chap cycle
    if (cfg.ching && barStep % 4 === 0) {
      addStereo(barStep % 8 === 0 ? chingOpen : chingClosed, t, cfg.ching, 0.32);
    }

    // Percussion groove
    if (cfg.drums) {
      if (barStep === 0 || barStep === 8 || (cfg.intense && (barStep === 6 || barStep === 12))) {
        addStereo(drumLow, t, 0.42, -0.1);
      } else if (barStep === 4 || barStep === 14 || (cfg.intense && barStep % 2 === 1 && s % 4 === 3)) {
        addStereo(drumMid, t, 0.3, 0.12);
      }
    }

    // Khong Wong Yai harmonic circle (every 2 steps)
    if (s % 2 === 0) {
      const idx = (cfg.melody[(s / 2 + phrase * 2) % cfg.melody.length] + phrase) % scale.length;
      const f = root * scale[idx];
      addStereo(noteKhong(step * 2.6, f), t, cfg.khongGain, -0.28 + (idx % 3) * 0.18);
      if (barStep === 0) {
        addStereo(noteKhong(step * 4.5, root * 0.5), t, cfg.khongGain * 0.85, 0);
      }
    }

    // Ranat Ek / Thum lead phrases
    if (cfg.ranatGain > 0 && (s % 2 === 0 || (cfg.fastRanat && s % 3 !== 1))) {
      const mIdx = (cfg.melody[(s + phrase * 3) % cfg.melody.length] + (barStep >= 12 ? 1 : 0)) % scale.length;
      const f = root * scale[mIdx] * (cfg.ranatOctave ?? 2);
      const n = noteRanat(step * 1.6, f, cfg.intense ? 1.15 : 0.85);
      addStereo(n, t, cfg.ranatGain, 0.22 * Math.sin(s * 0.7));
      // Octave coupling (Ranat style)
      if (barStep % 4 === 0) {
        addStereo(noteRanat(step * 1.8, f * 0.5, 0.7), t + 0.008, cfg.ranatGain * 0.6, -0.18);
      }
    }

    // Expressive Wind (Pi Nai / Khlui) or So U counter-melody
    if (barStep === 0 || barStep === 6 || barStep === 10) {
      const dur = step * (barStep === 10 ? 5.5 : 4.2);
      const wIdx = (cfg.melody[(Math.floor(s / 4) + phrase) % cfg.melody.length] + 2) % scale.length;
      const f = root * scale[wIdx] * (cfg.windOctave ?? 1);
      if (cfg.useSoU && phrase % 2 === 1) {
        addStereo(noteSoU(dur, f), t, cfg.windGain, -0.25);
      } else if (cfg.windGain > 0) {
        addStereo(noteWind(dur, f, cfg.reed), t, cfg.windGain, 0.25);
      }
    }
  }

  // Wrap the tail into the beginning for a 100% click-free seamless loop
  const outSamples = Math.round(seconds * SR);
  const tailSamples = L.length - outSamples;
  const outL = new Float32Array(outSamples);
  const outR = new Float32Array(outSamples);
  for (let i = 0; i < outSamples; i++) {
    outL[i] = L[i];
    outR[i] = R[i];
  }
  for (let i = 0; i < tailSamples && i < outSamples; i++) {
    const fade = 1 - i / tailSamples;
    outL[i] += L[outSamples + i] * fade;
    outR[i] += R[outSamples + i] * fade;
  }

  encodeMp3(path.join(outAudio180, `bgm-${id}.mp3`), outL, outR, '128k', 0.86);
}

function buildAllBgm() {
  const pentatonic = [1, 9/8, 5/4, 3/2, 5/3, 2, 9/4, 5/2];
  const mystic7 = [1, 1.10, 1.24, 1.35, 1.50, 1.66, 1.84, 2.0];

  renderBgmTrack('town', {
    bpm: 84, root: 261.63, scale: pentatonic,
    melody: [0, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 1, 2, 0],
    padGain: 0.08, khongGain: 0.22, ranatGain: 0.24, ranatOctave: 2,
    windGain: 0.18, windOctave: 2, reed: false, useSoU: true,
    drums: true, drumFreq: 68, drumGain: 0.65, ching: 0.25, intense: false
  });
  renderBgmTrack('guild', {
    bpm: 76, root: 293.66, scale: pentatonic,
    melody: [0, 3, 2, 4, 5, 3, 2, 1, 0, 2, 3, 5, 4, 2, 1, 0],
    padGain: 0.09, khongGain: 0.26, ranatGain: 0.20, ranatOctave: 2,
    windGain: 0.16, windOctave: 1, reed: false, useSoU: true,
    drums: true, drumFreq: 62, drumGain: 0.75, ching: 0.22, intense: false
  });
  renderBgmTrack('field', {
    bpm: 104, root: 293.66, scale: pentatonic,
    melody: [0, 1, 2, 4, 3, 5, 4, 2, 3, 4, 6, 5, 4, 2, 1, 0],
    padGain: 0.07, khongGain: 0.20, ranatGain: 0.26, ranatOctave: 2, fastRanat: true,
    windGain: 0.19, windOctave: 2, reed: false, useSoU: true,
    drums: true, drumFreq: 72, drumGain: 0.75, ching: 0.28, intense: false
  });
  renderBgmTrack('night', {
    bpm: 64, root: 220.0, scale: mystic7,
    melody: [0, 2, 1, 4, 3, 2, 0, 1, 2, 5, 4, 2, 1, 0],
    padGain: 0.11, khongGain: 0.18, ranatGain: 0.16, ranatOctave: 1,
    windGain: 0.22, windOctave: 1, reed: false, useSoU: true,
    drums: false, drumFreq: 55, drumGain: 0.4, ching: 0.15, intense: false
  });
  renderBgmTrack('dungeon', {
    bpm: 56, root: 164.81, scale: mystic7,
    melody: [0, 1, 3, 2, 0, 4, 3, 1, 2, 0, 1, 2],
    padGain: 0.13, khongGain: 0.22, ranatGain: 0.18, ranatOctave: 1,
    windGain: 0.15, windOctave: 1, reed: true, useSoU: false,
    drums: true, drumFreq: 48, drumGain: 0.7, ching: 0.12, intense: false
  });
  renderBgmTrack('ruins', {
    bpm: 88, root: 246.94, scale: mystic7,
    melody: [0, 2, 4, 3, 1, 2, 5, 4, 2, 3, 1, 0],
    padGain: 0.10, khongGain: 0.24, ranatGain: 0.22, ranatOctave: 2,
    windGain: 0.22, windOctave: 2, reed: true, useSoU: false,
    drums: true, drumFreq: 60, drumGain: 0.8, ching: 0.25, intense: false
  });
  renderBgmTrack('peak', {
    bpm: 70, root: 329.63, scale: pentatonic,
    melody: [0, 2, 4, 5, 3, 4, 2, 0, 1, 3, 5, 6, 4, 2],
    padGain: 0.11, khongGain: 0.26, ranatGain: 0.18, ranatOctave: 2,
    windGain: 0.20, windOctave: 2, reed: false, useSoU: false,
    drums: false, drumFreq: 64, drumGain: 0.45, ching: 0.20, intense: false
  });
  renderBgmTrack('arena', {
    bpm: 126, root: 293.66, scale: mystic7,
    melody: [0, 2, 4, 5, 4, 2, 3, 1, 0, 4, 5, 6, 5, 3, 2, 1],
    padGain: 0.08, khongGain: 0.22, ranatGain: 0.28, ranatOctave: 2, fastRanat: true,
    windGain: 0.24, windOctave: 2, reed: true, useSoU: false,
    drums: true, drumFreq: 62, drumGain: 1.0, ching: 0.32, intense: true
  });
  renderBgmTrack('boss', {
    bpm: 138, root: 220.0, scale: mystic7,
    melody: [0, 3, 2, 5, 4, 6, 5, 3, 4, 2, 1, 4, 3, 1, 2, 0],
    padGain: 0.10, khongGain: 0.25, ranatGain: 0.30, ranatOctave: 2, fastRanat: true,
    windGain: 0.26, windOctave: 2, reed: true, useSoU: false,
    drums: true, drumFreq: 54, drumGain: 1.15, ching: 0.35, intense: true
  });
}

console.log('Synthesizing 49 class combat sounds...');
buildClassSounds();
console.log('Synthesizing 68 skill family sounds...');
buildFamilySounds();
console.log('Synthesizing 19 general SFX...');
buildGeneralSfx();
console.log('Synthesizing 9 full-length Thai Folk-Mystic BGM tracks...');
buildAllBgm();
rmSync(tmp, {recursive: true, force: true});
console.log('Done! All 145 audio files rendered.');
