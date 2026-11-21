(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  const VIZ_MODES = [
    { id: 'aurora', label: '오로라' },
    { id: 'bars', label: '스튜디오 바' },
    { id: 'orbital', label: '오비탈 펄스' }
  ];

  class Visualizer {
    constructor(opts) {
      this.canvas = opts.canvas;
      this.ambilightCanvas = opts.ambilightCanvas;
      this.bridgeCanvas = opts.bridgeCanvas;
      this.mediaEl = opts.mediaEl;
      this.audioEngine = opts.audioEngine;

      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.ambiCtx = this.ambilightCanvas ? this.ambilightCanvas.getContext('2d') : null;
      this.bridgeCtx = this.bridgeCanvas ? this.bridgeCanvas.getContext('2d') : null;

      this.modeIndex = 0;
      this.ambilightEnabled = true;
      this.isDesktopPiP = false;
      this.bridgeActive = false;

      this.trackCtx = {
        kind: 'empty',
        ext: 'mp3',
        title: 'AETHER Studio',
        artist: '',
        palette: ['#38bdf8', '#818cf8'],
        artworkEl: null,
        activeLyric: ''
      };

      this.rafId = 0;
      this.running = false;
      this.lastAmbiTick = 0;
      this.peaks = new Float32Array(64);
      this.worker = null;
      this.workerInterval = 0;

      this._bindResize();
      this._tick = this._tick.bind(this);
    }

    _bindResize() {
      if (!this.canvas || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => {
        this.resize();
      });
      ro.observe(this.canvas);
      this.resize();
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }

    setMode(modeId) {
      const idx = VIZ_MODES.findIndex((m) => m.id === modeId);
      if (idx >= 0) this.modeIndex = idx;
      return VIZ_MODES[this.modeIndex];
    }

    cycleMode() {
      this.modeIndex = (this.modeIndex + 1) % VIZ_MODES.length;
      return VIZ_MODES[this.modeIndex];
    }

    getMode() {
      return VIZ_MODES[this.modeIndex];
    }

    setAmbilightEnabled(enabled) {
      this.ambilightEnabled = Boolean(enabled);
    }

    setDesktopPiP(active) {
      this.isDesktopPiP = Boolean(active);
      setTimeout(() => this.resize(), 40);
    }

    setActiveLyric(text) {
      this.trackCtx.activeLyric = String(text || '');
    }

    setTrackContext(info) {
      this.trackCtx = Object.assign({}, this.trackCtx, info || {});
      this.renderBridgeFrame(performance.now());
    }

    setBridgeActive(active) {
      this.bridgeActive = Boolean(active);
      if (this.bridgeActive) {
        this._startWorkerTick();
      } else {
        this._stopWorkerTick();
      }
    }

    _startWorkerTick() {
      this._stopWorkerTick();
      try {
        const code = 'setInterval(function(){ postMessage(1); }, 42);';
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this.worker = new Worker(url);
        URL.revokeObjectURL(url);
        this.worker.onmessage = () => {
          if (this.bridgeActive) {
            this.renderBridgeFrame(performance.now());
          }
        };
      } catch {
        this.workerInterval = global.setInterval(() => {
          if (this.bridgeActive) {
            this.renderBridgeFrame(performance.now());
          }
        }, 42);
      }
    }

    _stopWorkerTick() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      if (this.workerInterval) {
        global.clearInterval(this.workerInterval);
        this.workerInterval = 0;
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.rafId = global.requestAnimationFrame(this._tick);
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        global.cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this._stopWorkerTick();
    }

    _tick(now) {
      if (!this.running) return;
      this.rafId = global.requestAnimationFrame(this._tick);

      if (this.trackCtx.kind === 'audio') {
        this._renderAudioStage(now);
      }

      if (this.ambilightEnabled && !this.isDesktopPiP && now - this.lastAmbiTick > 65) {
        this.lastAmbiTick = now;
        this._renderAmbilight(now);
      }

      if (this.bridgeActive && this.trackCtx.kind === 'audio') {
        this.renderBridgeFrame(now);
      }
    }

    _getSampleArray(now, isPlaying) {
      const freq = this.audioEngine ? this.audioEngine.getFrequencyData() : null;
      if (freq && isPlaying) return freq;
      const t = now * 0.0018;
      const arr = new Uint8Array(64);
      const amp = isPlaying ? 75 : 22;
      for (let i = 0; i < 64; i++) {
        const v = Math.sin(t + i * 0.28) * 0.5 + Math.cos(t * 0.7 - i * 0.14) * 0.5;
        arr[i] = Math.max(8, Math.floor((0.4 + 0.5 * v) * amp));
      }
      return arr;
    }

    _renderAudioStage(now) {
      if (!this.ctx || !this.canvas) return;
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (w <= 1 || h <= 1) return;

      const ctx = this.ctx;
      const palette = this.trackCtx.palette || ['#38bdf8', '#818cf8'];
      const isPlaying = this.mediaEl ? !this.mediaEl.paused : false;
      const freq = this._getSampleArray(now, isPlaying);

      ctx.clearRect(0, 0, w, h);

      const energy = this.audioEngine && isPlaying ? this.audioEngine.getEnergy() : 0.12;
      const rad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.58);
      rad.addColorStop(0, palette[0] + (isPlaying ? '33' : '1a'));
      rad.addColorStop(0.55, palette[1] + '14');
      rad.addColorStop(1, 'rgba(4, 6, 10, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, w, h);

      const mode = VIZ_MODES[this.modeIndex].id;
      if (mode === 'bars') {
        this._drawBars(ctx, w, h, freq, palette);
      } else if (mode === 'orbital') {
        this._drawOrbital(ctx, w, h, freq, palette, now, energy);
      } else {
        this._drawAurora(ctx, w, h, freq, palette, now, energy);
      }
    }

    _drawAurora(ctx, w, h, freq, palette, now, energy) {
      const t = now * 0.0012;
      const baseY = h * 0.72;
      const layers = 3;

      for (let l = 0; l < layers; l++) {
        ctx.beginPath();
        const points = 42;
        for (let i = 0; i <= points; i++) {
          const ratio = i / points;
          const x = ratio * w;
          const bin = Math.min(freq.length - 1, Math.floor(ratio * 48));
          const mag = freq[bin] / 255;
          const wave = Math.sin(ratio * 6.5 + t * (1.2 + l * 0.35) + l * 1.4) * (16 + energy * 45);
          const y = baseY - (mag * h * (0.24 - l * 0.04)) + wave + l * 18;
          if (i === 0) ctx.moveTo(x, y);
          else {
            const prevX = ((i - 1) / points) * w;
            const midX = (prevX + x) * 0.5;
            ctx.quadraticCurveTo(prevX, y, midX, y);
          }
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - h * 0.28, 0, h);
        const alpha = l === 0 ? '48' : l === 1 ? '2e' : '1a';
        grad.addColorStop(0, (l % 2 === 0 ? palette[0] : palette[1]) + alpha);
        grad.addColorStop(1, 'rgba(4, 6, 11, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = (l === 0 ? palette[0] : palette[1]) + (l === 0 ? 'cc' : '66');
        ctx.lineWidth = l === 0 ? 2.4 : 1.4;
        ctx.stroke();
      }
    }

    _drawBars(ctx, w, h, freq, palette) {
      const count = 64;
      const totalW = w * 0.86;
      const startX = (w - totalW) * 0.5;
      const step = totalW / count;
      const barW = Math.max(3, step * 0.62);
      const bottomY = h * 0.84;
      const maxBarH = h * 0.34;

      const barGrad = ctx.createLinearGradient(0, bottomY - maxBarH, 0, bottomY);
      barGrad.addColorStop(0, palette[1]);
      barGrad.addColorStop(0.45, palette[0]);
      barGrad.addColorStop(1, palette[0] + '33');

      for (let i = 0; i < count; i++) {
        const bin = Math.floor((i / count) * 56);
        const norm = freq[bin] / 255;
        const barH = Math.max(4, norm * maxBarH);
        if (barH > this.peaks[i]) this.peaks[i] = barH;
        else this.peaks[i] = Math.max(barH, this.peaks[i] - 1.6);

        const x = startX + i * step + (step - barW) * 0.5;
        const y = bottomY - barH;
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, Math.min(4, barW * 0.5));
        ctx.fill();

        ctx.fillStyle = '#ffffffcc';
        ctx.fillRect(x, bottomY - this.peaks[i] - 4, barW, 2.2);
      }
    }

    _drawOrbital(ctx, w, h, freq, palette, now, energy) {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const baseR = Math.min(w, h) * (0.28 + energy * 0.05);
      const bars = 72;
      const rot = now * 0.00035;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const bin = i % 48;
        const len = 8 + (freq[bin] / 255) * (Math.min(w, h) * 0.14);
        const x1 = Math.cos(angle) * baseR;
        const y1 = Math.sin(angle) * baseR;
        const x2 = Math.cos(angle) * (baseR + len);
        const y2 = Math.sin(angle) * (baseR + len);

        ctx.strokeStyle = i % 2 === 0 ? palette[0] + 'cc' : palette[1] + 'aa';
        ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.0045);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _renderAmbilight(now) {
      if (!this.ambiCtx || !this.ambilightCanvas) return;
      const ctx = this.ambiCtx;
      const w = this.ambilightCanvas.width;
      const h = this.ambilightCanvas.height;

      if (this.trackCtx.kind === 'video' && this.mediaEl && this.mediaEl.readyState >= 2) {
        try {
          ctx.drawImage(this.mediaEl, 0, 0, w, h);
          return;
        } catch { }
      }

      const palette = this.trackCtx.palette || ['#38bdf8', '#818cf8'];
      const pulse = 0.4 + Math.sin(now * 0.002) * 0.12;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.6);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(0.6, palette[1]);
      grad.addColorStop(1, '#06070b');
      ctx.globalAlpha = pulse;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    renderBridgeFrame(now) {
      if (!this.bridgeCtx || !this.bridgeCanvas) return;
      const ctx = this.bridgeCtx;
      const w = this.bridgeCanvas.width;
      const h = this.bridgeCanvas.height;
      const palette = this.trackCtx.palette || ['#38bdf8', '#818cf8'];
      const isPlaying = this.mediaEl ? !this.mediaEl.paused : false;
      const freq = this._getSampleArray(now || performance.now(), isPlaying);

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0b1120');
      bg.addColorStop(1, '#05070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.25, h * 0.42, 10, w * 0.3, h * 0.45, 260);
      glow.addColorStop(0, palette[0] + '44');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      const artX = 36;
      const artY = 44;
      const artSize = 148;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 18);
      ctx.clip();
      const artEl = this.trackCtx.artworkEl;
      if (artEl && artEl.complete && artEl.naturalWidth > 0) {
        ctx.drawImage(artEl, artX, artY, artSize, artSize);
      } else {
        ctx.fillStyle = '#12192b';
        ctx.fillRect(artX, artY, artSize, artSize);
        ctx.strokeStyle = palette[0];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(artX + artSize * 0.5, artY + artSize * 0.5, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = palette[0];
        ctx.beginPath();
        ctx.arc(artX + artSize * 0.5, artY + artSize * 0.5, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = palette[0];
      ctx.font = 'bold 14px monospace';
      ctx.fillText(String(this.trackCtx.ext || 'MP3').toUpperCase() + ' · AETHER PIP', 208, 72);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 25px sans-serif';
      const title = String(this.trackCtx.title || 'AETHER Audio');
      ctx.fillText(title.length > 24 ? title.slice(0, 23) + '…' : title, 208, 112);

      ctx.fillStyle = '#9aa7bd';
      ctx.font = '500 17px sans-serif';
      const artist = String(this.trackCtx.artist || 'Audio Studio');
      ctx.fillText(artist.length > 28 ? artist.slice(0, 27) + '…' : artist, 208, 144);

      if (this.trackCtx.activeLyric) {
        ctx.fillStyle = '#e0f5ff';
        ctx.font = '600 16px sans-serif';
        const lyr = String(this.trackCtx.activeLyric);
        ctx.fillText(lyr.length > 34 ? lyr.slice(0, 33) + '…' : lyr, 208, 182);
      }

      const bars = 40;
      const bx = 36;
      const by = 294;
      const bw = w - 72;
      const step = bw / bars;
      for (let i = 0; i < bars; i++) {
        const val = (freq[i % freq.length] / 255) * 66;
        ctx.fillStyle = i % 2 === 0 ? palette[0] : palette[1];
        ctx.beginPath();
        ctx.roundRect(bx + i * step, by - val, Math.max(4, step - 4), Math.max(5, val), 3);
        ctx.fill();
      }

      const cur = this.mediaEl ? this.mediaEl.currentTime : 0;
      const dur = this.mediaEl && Number.isFinite(this.mediaEl.duration) ? this.mediaEl.duration : 0;
      const ratio = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;

      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.roundRect(36, 316, w - 72, 6, 3);
      ctx.fill();

      ctx.fillStyle = palette[0];
      ctx.beginPath();
      ctx.roundRect(36, 316, Math.max(6, (w - 72) * ratio), 6, 3);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px monospace';
      ctx.fillText(Aether.utils.formatTime(cur) + ' / ' + Aether.utils.formatTime(dur), 36, 344);
      ctx.textAlign = 'right';
      ctx.fillText(isPlaying ? '▶ PLAYING' : '❚❚ PAUSED', w - 36, 344);
      ctx.textAlign = 'left';
    }
  }

  Aether.Visualizer = Visualizer;
})(window);
