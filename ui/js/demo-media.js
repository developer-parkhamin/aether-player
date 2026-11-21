(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  function createDemoVideoTrack(audioEngine) {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    let timerId = 0;
    let startTs = performance.now();
    let elapsedPaused = 0;
    let paused = false;
    let disposed = false;

    let synthGain = null;
    let osc1 = null;
    let osc2 = null;
    let lfo = null;
    let synthStarted = false;

    const particles = [];
    for (let i = 0; i < 42; i++) {
      particles.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        r: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.25 - Math.random() * 0.55,
        a: 0.25 + Math.random() * 0.65
      });
    }

    function ensureSynthAudio() {
      if (synthStarted || !audioEngine) return;
      const audioCtx = audioEngine.ensureInitialized(document.getElementById('media-element'));
      if (!audioCtx) return;

      synthGain = audioCtx.createGain();
      synthGain.gain.value = 0;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;

      osc1 = audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = 110;

      osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 164.81;

      lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.28;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 260;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(synthGain);
      audioEngine.connectExternalNode(synthGain);

      osc1.start();
      osc2.start();
      lfo.start();
      synthStarted = true;
    }

    function updateSynthGain() {
      if (!synthGain || !audioEngine || !audioEngine.ctx) return;
      const mediaEl = document.getElementById('media-element');
      const appRoot = document.getElementById('app-root');
      const vol = mediaEl ? mediaEl.volume : 0.85;
      const isMuted = appRoot && appRoot.dataset.muted === 'true';
      const target = (!paused && !isMuted) ? (0.12 * vol) : 0;
      synthGain.gain.setTargetAtTime(target, audioEngine.ctx.currentTime, 0.08);
    }

    function setPlaying(shouldPlay) {
      if (disposed) return;
      if (shouldPlay && paused) {
        startTs = performance.now() - elapsedPaused;
      } else if (!shouldPlay && !paused) {
        elapsedPaused = performance.now() - startTs;
      }
      paused = !shouldPlay;

      if (shouldPlay) {
        ensureSynthAudio();
        if (audioEngine && audioEngine.ctx) audioEngine.resume();
      }
      updateSynthGain();
    }

    function drawFrame() {
      if (disposed) return;
      const now = paused ? startTs + elapsedPaused : performance.now();
      const t = (now - startTs) * 0.001;
      const w = 960;
      const h = 540;
      const energy = audioEngine && !paused ? audioEngine.getEnergy() : 0.12;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#060a14');
      bg.addColorStop(0.6, '#0a1326');
      bg.addColorStop(1, '#04060b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      const horizonY = h * 0.64;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * 26, horizonY);
        ctx.lineTo(w * 0.5 + i * 135, h);
        ctx.stroke();
      }
      for (let r = 0; r < 9; r++) {
        const phase = ((r / 9) + (t * 0.25)) % 1;
        const y = horizonY + Math.pow(phase, 2.1) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      const cx = w * 0.5;
      const cy = h * 0.43;
      const pulseR = 115 + energy * 42;

      const aura = ctx.createRadialGradient(cx, cy, 12, cx, cy, 240);
      aura.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
      aura.addColorStop(0.55, 'rgba(129, 140, 248, 0.14)');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (0.35 + ring * 0.18) * (ring % 2 === 0 ? 1 : -1));
        ctx.scale(1, 0.52 + ring * 0.16);
        ctx.strokeStyle = ring === 0 ? 'rgba(34, 211, 238, 0.85)' : 'rgba(129, 140, 248, 0.55)';
        ctx.lineWidth = ring === 0 ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR + ring * 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!paused) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
        }
        ctx.fillStyle = 'rgba(186, 230, 253, ' + p.a + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 32px sans-serif';
      ctx.fillText('AETHER ORBIT · CINEMA DEMO', cx, cy + 8);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 14px monospace';
      ctx.fillText('LIVE 60FPS STREAM · PRESS [P] FOR DESKTOP PIP', cx, cy + 36);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
      ctx.font = '600 13px monospace';
      ctx.fillText('REC ' + Aether.utils.formatTime(t), 28, 36);
      ctx.textAlign = 'right';
      ctx.fillText('960×540 · WEBM STREAM', w - 28, 36);
      ctx.textAlign = 'left';
    }

    drawFrame();
    timerId = global.setInterval(drawFrame, 33);
    const stream = canvas.captureStream(30);

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (timerId) global.clearInterval(timerId);
      stream.getTracks().forEach((tr) => tr.stop());
      try {
        if (osc1) osc1.stop();
        if (osc2) osc2.stop();
        if (lfo) lfo.stop();
        if (synthGain) synthGain.disconnect();
      } catch { }
    }

    return {
      id: 'demo-video-' + Date.now(),
      name: 'Aether Orbit (Demo Video).webm',
      title: 'Aether Orbit · 데모 영상',
      artist: 'AETHER Cinema Engine',
      album: 'Interactive Demo',
      ext: 'webm',
      kind: 'video',
      url: '',
      stream: stream,
      size: 0,
      duration: Infinity,
      width: 960,
      height: 540,
      artworkUrl: Aether.utils.createArtworkDataUrl('Aether Orbit', 'Cinema Demo', ['#38bdf8', '#818cf8']),
      palette: ['#38bdf8', '#818cf8'],
      isDemo: true,
      isLiveStream: true,
      setDemoPlaying: setPlaying,
      updateDemoVolume: updateSynthGain,
      demoDispose: dispose
    };
  }

  function createDemoAudioTrack() {
    const sampleRate = 22050;
    const durationSec = 24;
    const numSamples = sampleRate * durationSec;
    const numChannels = 2;
    const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
    const view = new DataView(buffer);

    function writeAscii(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * numChannels * 2, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, numSamples * numChannels * 2, true);

    const chords = [
      [130.81, 196.0, 246.94, 293.66],
      [110.0, 164.81, 220.0, 261.63],
      [87.31, 130.81, 174.61, 220.0],
      [98.0, 146.83, 196.0, 246.94]
    ];

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const bar = Math.floor((t / 6) % chords.length);
      const barPos = (t % 6) / 6;
      const chord = chords[bar];

      const fadeIn = Math.min(1, t / 0.8);
      const fadeOut = Math.min(1, (durationSec - t) / 1.2);
      const masterEnv = fadeIn * fadeOut;

      let padL = 0;
      let padR = 0;
      for (let n = 0; n < chord.length; n++) {
        const f = chord[n];
        padL += Math.sin(2 * Math.PI * f * t + Math.sin(t * 0.9) * 0.25);
        padR += Math.sin(2 * Math.PI * (f * 1.002) * t + Math.cos(t * 0.8) * 0.25);
      }

      const beatTime = t % 0.5;
      const arpNote = chord[Math.floor(t * 2) % chord.length] * 2;
      const pluckEnv = Math.exp(-beatTime * 6.5);
      const arp = Math.sin(2 * Math.PI * arpNote * t) * pluckEnv * 0.45;

      const swell = 0.72 + 0.28 * Math.sin(barPos * Math.PI);
      const sampleL = Math.max(-1, Math.min(1, ((padL / 4) * 0.36 * swell + arp * 0.25) * masterEnv));
      const sampleR = Math.max(-1, Math.min(1, ((padR / 4) * 0.36 * swell + arp * 0.22) * masterEnv));

      view.setInt16(offset, Math.round(sampleL * 32767), true);
      view.setInt16(offset + 2, Math.round(sampleR * 32767), true);
      offset += 4;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const palette = ['#f472b6', '#38bdf8'];

    const demoLyrics = [
      { time: 0.5, text: 'AETHER Audio Studio · 실시간 싱크 가사 데모' },
      { time: 4.5, text: 'MP3 · LRC 가사 · 5-밴드 이퀄라이저 지원' },
      { time: 9.0, text: '[P] 키를 눌러 플로팅 PIP 창으로 전환해 보세요' },
      { time: 14.0, text: 'Alt+Shift+G로 클릭 통과 고스트 모드도 가능합니다' },
      { time: 19.0, text: '어디서든 빛과 소리를 자유롭게 감상하세요' }
    ];

    return {
      id: 'demo-audio-' + Date.now(),
      name: 'Midnight Signal (Demo Audio).mp3',
      title: 'Midnight Signal · 데모 오디오',
      artist: 'AETHER Synth Lab',
      album: 'Obsidian Sessions',
      ext: 'mp3',
      kind: 'audio',
      url: url,
      size: blob.size,
      duration: durationSec,
      width: 0,
      height: 0,
      artworkUrl: Aether.utils.createArtworkDataUrl('Midnight Signal', 'AETHER Synth Lab', palette),
      palette: palette,
      lyrics: demoLyrics,
      isObjectUrl: true,
      isDemo: true
    };
  }

  Aether.demo = {
    createDemoVideoTrack: createDemoVideoTrack,
    createDemoAudioTrack: createDemoAudioTrack
  };
})(window);
