(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  const BAND_FREQUENCIES = [60, 230, 910, 3600, 14000];
  const EQ_PRESETS = {
    flat: [0, 0, 0, 0, 0],
    bass: [5.5, 3.5, 0, 1, 1.5],
    cinema: [4, 1.5, -1, 2.5, 3.5],
    vocal: [-2, -1, 3.5, 4, 1.5],
    night: [-4, 1, 2, 1.5, -2.5]
  };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.source = null;
      this.filters = [];
      this.preamp = null;
      this.analyser = null;
      this.mediaEl = null;
      this.freqData = null;
      this.timeData = null;
      this.gains = [0, 0, 0, 0, 0];
      this.boost = 1.0;
      this.initialized = false;
    }

    ensureInitialized(mediaEl) {
      if (this.initialized) return this.ctx;
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;

      this.mediaEl = mediaEl;
      this.ctx = new AudioCtx();

      this.preamp = this.ctx.createGain();
      this.preamp.gain.value = this.boost;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

      this.filters = BAND_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx.createBiquadFilter();
        filter.frequency.value = freq;
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === BAND_FREQUENCIES.length - 1) filter.type = 'highshelf';
        else {
          filter.type = 'peaking';
          filter.Q.value = 1.1;
        }
        filter.gain.value = this.gains[idx] || 0;
        return filter;
      });

      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }
      this.filters[this.filters.length - 1].connect(this.preamp);
      this.preamp.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      if (mediaEl) {
        try {
          this.source = this.ctx.createMediaElementSource(mediaEl);
          this.source.connect(this.filters[0]);
        } catch (err) {
          console.warn('[AudioEngine] MediaElementSource unavailable:', err);
        }
      }

      this.initialized = true;
      return this.ctx;
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
    }

    getInputNode() {
      return this.filters.length ? this.filters[0] : null;
    }

    connectExternalNode(node) {
      if (!node || !this.filters.length) return;
      node.connect(this.filters[0]);
    }

    setBand(index, db) {
      const clamped = Math.max(-12, Math.min(12, Number(db) || 0));
      this.gains[index] = clamped;
      if (this.filters[index] && this.ctx) {
        this.filters[index].gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
      }
    }

    setPreset(name) {
      const values = EQ_PRESETS[name] || EQ_PRESETS.flat;
      for (let i = 0; i < values.length; i++) {
        this.setBand(i, values[i]);
      }
      return values.slice();
    }

    setBoost(percent) {
      const p = Math.max(100, Math.min(200, Number(percent) || 100));
      this.boost = p / 100;
      if (this.preamp && this.ctx) {
        this.preamp.gain.setTargetAtTime(this.boost, this.ctx.currentTime, 0.02);
      }
    }

    getFrequencyData() {
      if (!this.analyser || !this.freqData) return null;
      this.analyser.getByteFrequencyData(this.freqData);
      return this.freqData;
    }

    getEnergy() {
      const data = this.getFrequencyData();
      if (!data) return 0.08;
      let sum = 0;
      const limit = Math.min(48, data.length);
      for (let i = 0; i < limit; i++) {
        sum += data[i];
      }
      return sum / (limit * 255);
    }
  }

  Aether.AudioEngine = AudioEngine;
  Aether.EQ_PRESETS = EQ_PRESETS;
})(window);
