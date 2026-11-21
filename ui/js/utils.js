(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  const COMPOUND_EXTS = ['mp4.part', 'webm.part', 'mkv.part', 'm4v.part', 'mp3.part'];
  const VIDEO_EXTS = new Set([
    'mp4', 'webm', 'mkv', 'm4v', 'mov', 'ogv',
    'mp4.part', 'webm.part', 'mkv.part', 'm4v.part', 'part'
  ]);
  const AUDIO_EXTS = new Set(['mp3', 'mp3.part', 'wav', 'ogg', 'flac', 'm4a', 'aac']);
  const SUBTITLE_EXTS = new Set(['srt', 'vtt']);
  const LYRICS_EXTS = new Set(['lrc']);

  function getCompoundExtension(name) {
    if (!name || typeof name !== 'string') return '';
    const clean = name.split('?')[0].split('#')[0].toLowerCase();
    for (let i = 0; i < COMPOUND_EXTS.length; i++) {
      const ext = COMPOUND_EXTS[i];
      if (clean.endsWith('.' + ext)) return ext;
    }
    const dot = clean.lastIndexOf('.');
    if (dot < 0 || dot === clean.length - 1) return '';
    return clean.slice(dot + 1);
  }

  function getExtension(name) {
    return getCompoundExtension(name);
  }

  function stripMediaExtension(name) {
    if (!name || typeof name !== 'string') return '제목 없음';
    const ext = getCompoundExtension(name);
    if (ext && name.length > ext.length + 1) {
      return name.slice(0, name.length - ext.length - 1);
    }
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function detectMediaKind(name, mime) {
    const ext = getCompoundExtension(name);
    if (VIDEO_EXTS.has(ext)) return 'video';
    if (AUDIO_EXTS.has(ext)) return 'audio';
    if (SUBTITLE_EXTS.has(ext)) return 'subtitle';
    if (LYRICS_EXTS.has(ext)) return 'lyrics';

    const m = (mime || '').toLowerCase();
    if (m.startsWith('video/')) return 'video';
    if (m.startsWith('audio/')) return 'audio';
    if (m.includes('vtt') || m.includes('subrip')) return 'subtitle';
    return 'unknown';
  }

  function formatTime(seconds) {
    if (seconds === Infinity) return 'LIVE';
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const total = Math.floor(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    if (hrs > 0) return hrs + ':' + mm + ':' + ss;
    return mm + ':' + ss;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let val = bytes;
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024;
      idx += 1;
    }
    return val.toFixed(idx === 0 ? 0 : 1) + ' ' + units[idx];
  }

  function srtToVtt(srtText) {
    if (!srtText || typeof srtText !== 'string') return 'WEBVTT\n\n';
    const normalized = srtText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const lines = normalized.split('\n');
    const out = ['WEBVTT', ''];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (/^\d+$/.test(line.trim()) && i + 1 < lines.length && lines[i + 1].includes('-->')) {
        continue;
      }
      if (line.includes('-->')) {
        line = line.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      }
      out.push(line);
    }
    return out.join('\n');
  }

  function parseTimestampSeconds(ts) {
    const clean = String(ts || '').trim().replace(',', '.').split(' ')[0];
    const parts = clean.split(':');
    if (parts.length === 3) {
      return (Number(parts[0]) * 3600) + (Number(parts[1]) * 60) + Number(parts[2]);
    }
    if (parts.length === 2) {
      return (Number(parts[0]) * 60) + Number(parts[1]);
    }
    return NaN;
  }

  function parseSubtitles(rawText, ext) {
    if (!rawText || typeof rawText !== 'string') return [];
    const normalized = rawText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const blocks = normalized.split(/\n{2,}/);
    const cues = [];

    for (let i = 0; i < blocks.length; i++) {
      const rawLines = blocks[i].split('\n').map((l) => l.trimEnd()).filter(Boolean);
      if (!rawLines.length) continue;
      if (/^(WEBVTT|NOTE|STYLE|REGION)\b/i.test(rawLines[0])) continue;

      let arrowIdx = -1;
      for (let j = 0; j < Math.min(2, rawLines.length); j++) {
        if (rawLines[j].includes('-->')) {
          arrowIdx = j;
          break;
        }
      }
      if (arrowIdx < 0) continue;

      const timeParts = rawLines[arrowIdx].split('-->');
      if (timeParts.length < 2) continue;

      const start = parseTimestampSeconds(timeParts[0]);
      const end = parseTimestampSeconds(timeParts[1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

      const text = rawLines
        .slice(arrowIdx + 1)
        .join('\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (text) {
        cues.push({ start: start, end: end, text: text });
      }
    }

    cues.sort((a, b) => a.start - b.start);
    return cues;
  }

  function parseLrc(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/);
    const entries = [];
    const tagRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      tagRegex.lastIndex = 0;
      const times = [];
      let match;
      let lastEnd = 0;
      while ((match = tagRegex.exec(line)) !== null) {
        const mins = Number(match[1]);
        const secs = Number(match[2]);
        const fracStr = match[3] || '0';
        const frac = fracStr.length === 3 ? Number(fracStr) / 1000 : Number(fracStr) / 100;
        const total = mins * 60 + secs + frac;
        if (Number.isFinite(total)) times.push(total);
        lastEnd = tagRegex.lastIndex;
      }

      if (!times.length) continue;
      const lyricText = line.slice(lastEnd).trim();
      if (!lyricText) continue;

      for (let t = 0; t < times.length; t++) {
        entries.push({ time: times[t], text: lyricText });
      }
    }

    entries.sort((a, b) => a.time - b.time);
    return entries;
  }

  function createSubtitleBlobUrl(rawText, ext) {
    const isSrt = String(ext || '').toLowerCase() === 'srt' || !/^\s*WEBVTT/i.test(rawText || '');
    const vtt = isSrt ? srtToVtt(rawText) : rawText;
    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  function readSyncSafeInt(view, offset) {
    return (
      ((view.getUint8(offset) & 0x7f) << 21) |
      ((view.getUint8(offset + 1) & 0x7f) << 14) |
      ((view.getUint8(offset + 2) & 0x7f) << 7) |
      (view.getUint8(offset + 3) & 0x7f)
    );
  }

  function decodeTextBytes(bytes, encodingByte) {
    if (!bytes || bytes.length === 0) return '';
    try {
      if (encodingByte === 3) {
        return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/, '').trim();
      }
      if (encodingByte === 1) {
        if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
          return new TextDecoder('utf-16le').decode(bytes.subarray(2)).replace(/\0+$/, '').trim();
        }
        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
          return new TextDecoder('utf-16be').decode(bytes.subarray(2)).replace(/\0+$/, '').trim();
        }
        return new TextDecoder('utf-16le').decode(bytes).replace(/\0+$/, '').trim();
      }
      if (encodingByte === 2) {
        return new TextDecoder('utf-16be').decode(bytes).replace(/\0+$/, '').trim();
      }
      return new TextDecoder('iso-8859-1').decode(bytes).replace(/\0+$/, '').trim();
    } catch {
      let fallback = '';
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] >= 32) fallback += String.fromCharCode(bytes[i]);
      }
      return fallback.trim();
    }
  }

  function parseApicFrame(bytes) {
    if (!bytes || bytes.length < 8) return null;
    const encoding = bytes[0];
    let pos = 1;

    let mime = '';
    while (pos < bytes.length && bytes[pos] !== 0) {
      mime += String.fromCharCode(bytes[pos]);
      pos += 1;
    }
    pos += 1;
    if (pos >= bytes.length) return null;

    pos += 1;
    if (pos >= bytes.length) return null;

    if (encoding === 1 || encoding === 2) {
      while (pos + 1 < bytes.length && !(bytes[pos] === 0 && bytes[pos + 1] === 0)) {
        pos += 2;
      }
      pos += 2;
    } else {
      while (pos < bytes.length && bytes[pos] !== 0) {
        pos += 1;
      }
      pos += 1;
    }

    if (pos >= bytes.length) return null;
    const imageBytes = bytes.subarray(pos);
    if (imageBytes.length < 16) return null;

    return {
      mime: mime && mime.includes('/') ? mime : 'image/jpeg',
      bytes: imageBytes
    };
  }

  function parseID3v2Buffer(arrayBuffer) {
    const result = { title: '', artist: '', album: '', pictureBytes: null, pictureMime: '' };
    if (!arrayBuffer || arrayBuffer.byteLength < 10) return result;

    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
      return result;
    }

    const majorVer = bytes[3];
    if (majorVer < 3 || majorVer > 4) return result;

    const flags = bytes[5];
    const tagSize = readSyncSafeInt(view, 6);
    const tagEnd = Math.min(bytes.length, 10 + tagSize);
    let offset = 10;

    if ((flags & 0x40) !== 0 && offset + 4 <= tagEnd) {
      const extSize = majorVer === 4 ? readSyncSafeInt(view, offset) : view.getUint32(offset);
      offset += Math.max(4, extSize);
    }

    while (offset + 10 <= tagEnd) {
      const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const frameSize = majorVer === 4 ? readSyncSafeInt(view, offset + 4) : view.getUint32(offset + 4);
      offset += 10;
      if (frameSize <= 0 || offset + frameSize > tagEnd) break;

      const payload = bytes.subarray(offset, offset + frameSize);
      offset += frameSize;

      if (id === 'TIT2' && payload.length > 1) {
        result.title = decodeTextBytes(payload.subarray(1), payload[0]);
      } else if (id === 'TPE1' && payload.length > 1) {
        result.artist = decodeTextBytes(payload.subarray(1), payload[0]);
      } else if (id === 'TALB' && payload.length > 1) {
        result.album = decodeTextBytes(payload.subarray(1), payload[0]);
      } else if (id === 'APIC' && !result.pictureBytes) {
        const pic = parseApicFrame(payload);
        if (pic) {
          result.pictureBytes = pic.bytes;
          result.pictureMime = pic.mime;
        }
      }
    }

    return result;
  }

  async function parseID3v2(source) {
    let buffer = null;
    try {
      if (source && typeof source.slice === 'function') {
        const slice = source.slice(0, 524288);
        buffer = await slice.arrayBuffer();
      } else if (typeof source === 'string' && source.startsWith('http')) {
        const resp = await fetch(source, { headers: { Range: 'bytes=0-524287' } });
        if (resp.ok || resp.status === 206) {
          buffer = await resp.arrayBuffer();
        }
      }
    } catch {
      return null;
    }
    if (!buffer) return null;

    const parsed = parseID3v2Buffer(buffer);
    let artworkUrl = '';
    if (parsed.pictureBytes && typeof URL !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([parsed.pictureBytes], { type: parsed.pictureMime || 'image/jpeg' });
      artworkUrl = URL.createObjectURL(blob);
    }
    return {
      title: parsed.title,
      artist: parsed.artist,
      album: parsed.album,
      artworkUrl: artworkUrl
    };
  }

  const PALETTES = [
    ['#38bdf8', '#818cf8'],
    ['#22d3ee', '#34d399'],
    ['#f472b6', '#818cf8'],
    ['#fb7185', '#f59e0b'],
    ['#60a5fa', '#2dd4bf']
  ];

  function hashPalette(seed) {
    const str = String(seed || 'aether');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return PALETTES[Math.abs(hash) % PALETTES.length];
  }

  function createArtworkDataUrl(title, artist, palette) {
    if (typeof document === 'undefined') return '';
    try {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const colors = palette || PALETTES[0];

      const bg = ctx.createLinearGradient(0, 0, 256, 256);
      bg.addColorStop(0, '#0c1424');
      bg.addColorStop(1, '#05070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 256, 256);

      const glow = ctx.createRadialGradient(128, 108, 12, 128, 128, 120);
      glow.addColorStop(0, colors[0] + '55');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = colors[0] + 'aa';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 112, 54, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.moveTo(116, 92);
      ctx.lineTo(150, 112);
      ctx.lineTo(116, 132);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f4f7fb';
      ctx.font = '600 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(title || 'AETHER').slice(0, 22), 128, 206);
      ctx.fillStyle = '#9aa7bd';
      ctx.font = '400 12px sans-serif';
      ctx.fillText(String(artist || 'Studio').slice(0, 26), 128, 228);

      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  const storage = {
    get: function (key, fallback) {
      try {
        const raw = global.localStorage ? global.localStorage.getItem('aether.' + key) : null;
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set: function (key, val) {
      try {
        if (global.localStorage) {
          global.localStorage.setItem('aether.' + key, JSON.stringify(val));
        }
      } catch { }
    }
  };

  Aether.utils = {
    getCompoundExtension: getCompoundExtension,
    getExtension: getExtension,
    stripExtension: stripMediaExtension,
    stripMediaExtension: stripMediaExtension,
    detectMediaKind: detectMediaKind,
    formatTime: formatTime,
    formatBytes: formatBytes,
    srtToVtt: srtToVtt,
    parseSubtitles: parseSubtitles,
    parseLrc: parseLrc,
    createSubtitleBlobUrl: createSubtitleBlobUrl,
    parseID3v2Buffer: parseID3v2Buffer,
    parseID3v2: parseID3v2,
    hashPalette: hashPalette,
    createArtworkDataUrl: createArtworkDataUrl,
    storage: storage
  };
})(window);
