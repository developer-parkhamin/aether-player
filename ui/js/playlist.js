(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  class PlaylistManager {
    constructor(opts) {
      this.onChange = opts.onChange || function () {};
      this.onSelect = opts.onSelect || function () {};
      this.onSidecarAttached = opts.onSidecarAttached || function () {};
      this.onToast = opts.onToast || function () {};

      this.items = [];
      this.activeIndex = -1;
      this.shuffle = false;
      this.repeat = 'off';
      this.searchQuery = '';
      this.seq = 1;
    }

    getActiveTrack() {
      if (this.activeIndex < 0 || this.activeIndex >= this.items.length) return null;
      return this.items[this.activeIndex];
    }

    setSearchQuery(q) {
      this.searchQuery = String(q || '').trim().toLowerCase();
      this.onChange();
    }

    toggleShuffle() {
      this.shuffle = !this.shuffle;
      this.onChange();
      return this.shuffle;
    }

    cycleRepeat() {
      const order = ['off', 'all', 'one'];
      const next = (order.indexOf(this.repeat) + 1) % order.length;
      this.repeat = order[next];
      this.onChange();
      return this.repeat;
    }

    addNativeDescriptors(descriptors, startIndex) {
      if (!Array.isArray(descriptors) || !descriptors.length) return;
      const resolvedIndices = [];
      let addedMedia = 0;

      for (let i = 0; i < descriptors.length; i++) {
        const d = descriptors[i];
        if (!d) continue;

        if (d.isSubtitle) {
          this.attachSubtitleText(d.text || '', d.ext || 'srt', d.name || '자막');
          continue;
        }
        if (d.isLyrics) {
          this.attachLyricsText(d.text || '', d.name || '가사');
          continue;
        }

        const kind = Aether.utils.detectMediaKind(d.name, '');
        if (kind !== 'video' && kind !== 'audio') continue;

        const title = Aether.utils.stripMediaExtension(d.name);
        const ext = d.ext || Aether.utils.getCompoundExtension(d.name) || 'mp4';

        // Deduplicate by exact path if already in queue without aborting subsequent entries
        let existingIdx = -1;
        if (d.path) {
          existingIdx = this.items.findIndex((t) => t.path && t.path.toLowerCase() === d.path.toLowerCase());
        }
        if (existingIdx >= 0) {
          resolvedIndices.push(existingIdx);
          continue;
        }

        const track = {
          id: 'trk-' + (this.seq++),
          name: d.name,
          title: title,
          artist: kind === 'audio' ? '태그 분석 중...' : '',
          album: '',
          ext: ext,
          kind: kind,
          url: d.url,
          path: d.path || '',
          size: d.size || 0,
          duration: NaN,
          width: 0,
          height: 0,
          artworkUrl: '',
          palette: Aether.utils.hashPalette(title),
          subCues: d.autoSubtitleText ? Aether.utils.parseSubtitles(d.autoSubtitleText, d.autoSubtitleExt) : null,
          subtitleLabel: d.autoSubtitleName || '',
          lyrics: d.autoLyricsText ? Aether.utils.parseLrc(d.autoLyricsText) : null,
          lyricsLabel: d.autoLyricsName || '',
          isObjectUrl: false,
          isDemo: false
        };

        this.items.push(track);
        resolvedIndices.push(this.items.length - 1);
        addedMedia += 1;
        this._probeTrackMetadata(track, d.url);
      }

      if (resolvedIndices.length > 0) {
        this.onChange();
        const targetOffset = (Number.isInteger(startIndex) && startIndex >= 0 && startIndex < resolvedIndices.length) ? startIndex : 0;
        this.selectIndex(resolvedIndices[targetOffset]);
        if (addedMedia > 1) {
          this.onToast(addedMedia + '개 파일이 재생목록에 준비되었습니다', 'accent');
        }
      }
    }

    async addDomFiles(fileList) {
      if (!fileList || !fileList.length) return;
      const firstNewIndex = this.items.length;
      let addedMedia = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const ext = Aether.utils.getCompoundExtension(file.name);
        const kind = Aether.utils.detectMediaKind(file.name, file.type);

        if (kind === 'subtitle') {
          try {
            const text = await file.text();
            this.attachSubtitleText(text, ext, file.name);
          } catch { }
          continue;
        }

        if (kind === 'lyrics') {
          try {
            const text = await file.text();
            this.attachLyricsText(text, file.name);
          } catch { }
          continue;
        }

        if (kind !== 'video' && kind !== 'audio') continue;

        let blobForUrl = file;
        if (ext === 'mkv' || ext === 'webm.part' || ext === 'mkv.part') {
          blobForUrl = new Blob([file], { type: 'video/webm' });
        } else if (ext === 'mp4.part' || ext === 'm4v.part') {
          blobForUrl = new Blob([file], { type: 'video/mp4' });
        } else if (ext === 'mp3.part') {
          blobForUrl = new Blob([file], { type: 'audio/mpeg' });
        }

        const url = URL.createObjectURL(blobForUrl);
        const title = Aether.utils.stripMediaExtension(file.name);
        const track = {
          id: 'trk-' + (this.seq++),
          name: file.name,
          title: title,
          artist: kind === 'audio' ? '태그 분석 중...' : '',
          album: '',
          ext: ext || (kind === 'audio' ? 'mp3' : 'mp4'),
          kind: kind,
          url: url,
          path: '',
          size: file.size || 0,
          duration: NaN,
          width: 0,
          height: 0,
          artworkUrl: '',
          palette: Aether.utils.hashPalette(title),
          subCues: null,
          subtitleLabel: '',
          lyrics: null,
          lyricsLabel: '',
          isObjectUrl: true,
          isDemo: false
        };
        this.items.push(track);
        addedMedia += 1;
        this._probeTrackMetadata(track, file);
      }

      if (addedMedia > 0) {
        this.onChange();
        if (this.activeIndex === -1 || addedMedia === 1) {
          this.selectIndex(firstNewIndex);
        } else {
          this.onToast(addedMedia + '개의 파일이 재생목록에 추가되었습니다', 'accent');
        }
      } else {
        this.onToast('지원되지 않는 형식입니다 (MP4, WebM, MKV, MP3, .part, SRT/VTT/LRC)', 'warn');
      }
    }

    attachSubtitleText(rawText, ext, label) {
      let target = this.getActiveTrack();
      if (!target || target.kind !== 'video') {
        for (let i = this.items.length - 1; i >= 0; i--) {
          if (this.items[i].kind === 'video') {
            target = this.items[i];
            break;
          }
        }
      }
      if (!target) {
        this.onToast('자막을 연결할 동영상 트랙이 없습니다', 'warn');
        return;
      }
      const cues = Aether.utils.parseSubtitles(rawText, ext);
      if (!cues.length) {
        this.onToast('자막 파일에서 유효한 대사를 찾지 못했습니다', 'warn');
        return;
      }
      target.subCues = cues;
      target.subtitleLabel = label || '자막';
      this.onSidecarAttached(target, 'subtitle');
      this.onToast('자막 로드됨: ' + target.subtitleLabel + ' (' + cues.length + '줄)', 'accent');
    }

    attachLyricsText(rawText, label) {
      let target = this.getActiveTrack();
      if (!target || target.kind !== 'audio') {
        for (let i = this.items.length - 1; i >= 0; i--) {
          if (this.items[i].kind === 'audio') {
            target = this.items[i];
            break;
          }
        }
      }
      if (!target) {
        this.onToast('가사를 연결할 오디오 트랙이 없습니다', 'warn');
        return;
      }
      const lrc = Aether.utils.parseLrc(rawText);
      if (!lrc.length) {
        this.onToast('유효한 LRC 타임스탬프 가사를 찾지 못했습니다', 'warn');
        return;
      }
      target.lyrics = lrc;
      target.lyricsLabel = label || '가사';
      this.onSidecarAttached(target, 'lyrics');
      this.onToast('싱크 가사 로드됨: ' + target.lyricsLabel, 'accent');
    }

    addAndPlayDemo(track) {
      if (!track) return;
      for (let i = this.items.length - 1; i >= 0; i--) {
        if (this.items[i].isDemo && this.items[i].kind === track.kind) {
          this._cleanupTrackResources(this.items[i]);
          this.items.splice(i, 1);
          if (this.activeIndex >= i) this.activeIndex -= 1;
        }
      }
      this.items.push(track);
      this.onChange();
      this.selectIndex(this.items.length - 1);
    }

    selectIndex(index) {
      if (index < 0 || index >= this.items.length) return;
      this.activeIndex = index;
      const track = this.items[index];
      this.onChange();
      this.onSelect(track, index);
    }

    moveItem(fromIdx, toIdx) {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= this.items.length || toIdx >= this.items.length) {
        return;
      }
      const activeId = this.getActiveTrack() ? this.getActiveTrack().id : null;
      const moved = this.items.splice(fromIdx, 1)[0];
      this.items.splice(toIdx, 0, moved);
      if (activeId) {
        this.activeIndex = this.items.findIndex((t) => t.id === activeId);
      }
      this.onChange();
    }

    exportM3uEntries() {
      return this.items
        .filter((t) => Boolean(t.path))
        .map((t) => ({
          path: t.path,
          title: t.title || t.name,
          duration: Number.isFinite(t.duration) ? Math.round(t.duration) : -1
        }));
    }

    next(fromEnded) {
      if (!this.items.length) return;
      if (fromEnded && this.repeat === 'one') {
        this.selectIndex(this.activeIndex);
        return;
      }

      if (this.shuffle && this.items.length > 1) {
        let rand = this.activeIndex;
        while (rand === this.activeIndex) {
          rand = Math.floor(Math.random() * this.items.length);
        }
        this.selectIndex(rand);
        return;
      }

      const nextIdx = this.activeIndex + 1;
      if (nextIdx < this.items.length) {
        this.selectIndex(nextIdx);
      } else if (!fromEnded || this.repeat === 'all') {
        this.selectIndex(0);
      }
    }

    prev() {
      if (!this.items.length) return;
      if (this.shuffle && this.items.length > 1) {
        let rand = this.activeIndex;
        while (rand === this.activeIndex) {
          rand = Math.floor(Math.random() * this.items.length);
        }
        this.selectIndex(rand);
        return;
      }
      const prevIdx = (this.activeIndex - 1 + this.items.length) % this.items.length;
      this.selectIndex(prevIdx);
    }

    removeById(id) {
      const idx = this.items.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const removed = this.items[idx];
      const wasActive = idx === this.activeIndex;
      this._cleanupTrackResources(removed);
      this.items.splice(idx, 1);

      if (this.items.length === 0) {
        this.activeIndex = -1;
        this.onChange();
        this.onSelect(null, -1);
        return;
      }

      if (idx < this.activeIndex) {
        this.activeIndex -= 1;
      } else if (wasActive) {
        const nextIdx = Math.min(idx, this.items.length - 1);
        this.activeIndex = nextIdx;
        this.onChange();
        this.onSelect(this.items[nextIdx], nextIdx);
        return;
      }
      this.onChange();
    }

    clear() {
      this.items.forEach((t) => this._cleanupTrackResources(t));
      this.items = [];
      this.activeIndex = -1;
      this.onChange();
      this.onSelect(null, -1);
    }

    getFilteredItems() {
      if (!this.searchQuery) return this.items.map((item, idx) => ({ item, idx }));
      const q = this.searchQuery;
      const out = [];
      for (let i = 0; i < this.items.length; i++) {
        const t = this.items[i];
        const hay = (t.title + ' ' + t.name + ' ' + t.artist + ' ' + t.album).toLowerCase();
        if (hay.includes(q)) {
          out.push({ item: t, idx: i });
        }
      }
      return out;
    }

    async _probeTrackMetadata(track, source) {
      if (track.kind === 'audio') {
        const tags = await Aether.utils.parseID3v2(source);
        if (tags) {
          if (tags.title) track.title = tags.title;
          track.artist = tags.artist || '아티스트 정보 없음';
          if (tags.album) track.album = tags.album;
          if (tags.artworkUrl) track.artworkUrl = tags.artworkUrl;
        } else {
          track.artist = '아티스트 정보 없음';
        }
        this.onChange();
        if (this.getActiveTrack() && this.getActiveTrack().id === track.id) {
          this.onSelect(track, this.activeIndex, true);
        }
      }

      // Skip heavy parallel duration probing if queue has > 20 tracks; current track probes automatically on play
      if (track.url && this.items.length <= 20) {
        const probe = document.createElement(track.kind === 'audio' ? 'audio' : 'video');
        probe.preload = 'metadata';
        probe.muted = true;
        const cleanup = () => {
          probe.removeAttribute('src');
          probe.load();
        };
        probe.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(probe.duration)) track.duration = probe.duration;
          if (probe.videoWidth > 0) {
            track.width = probe.videoWidth;
            track.height = probe.videoHeight;
          }
          cleanup();
          this.onChange();
        }, { once: true });
        probe.addEventListener('error', cleanup, { once: true });
        probe.src = track.url;
      }
    }

    _cleanupTrackResources(track) {
      if (!track) return;
      if (track.demoDispose) {
        try { track.demoDispose(); } catch { }
      }
      if (track.isObjectUrl && track.url && track.url.startsWith('blob:')) {
        URL.revokeObjectURL(track.url);
      }
      if (track.artworkUrl && track.artworkUrl.startsWith('blob:')) {
        URL.revokeObjectURL(track.artworkUrl);
      }
    }
  }

  Aether.PlaylistManager = PlaylistManager;
})(window);
