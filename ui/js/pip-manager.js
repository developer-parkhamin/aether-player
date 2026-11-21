(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  class PiPManager {
    constructor(opts) {
      this.appRoot = opts.appRoot;
      this.mediaEl = opts.mediaEl;
      this.bridgeCanvas = opts.bridgeCanvas;
      this.bridgeVideo = opts.bridgeVideo;
      this.visualizer = opts.visualizer;
      this.bridge = opts.bridge;
      this.getRotation = opts.getRotation || function () { return 0; };
      this.onToast = opts.onToast || function () {};
      this.onTrackNav = opts.onTrackNav || function () {};
      this.onTogglePlay = opts.onTogglePlay || function () {};

      this.preferredMode = Aether.utils.storage.get('pipMode', this.bridge.isDesktop ? 'desktop' : 'separate');
      if (!this.bridge.isDesktop && this.preferredMode === 'desktop') {
        this.preferredMode = 'separate';
      }

      this.opacity = Aether.utils.storage.get('pipOpacity', 1.0);
      this.autoAspectFit = Aether.utils.storage.get('pipAutoAspect', true);
      this.globalHotkeys = Aether.utils.storage.get('globalHotkeys', true);

      this.desktopPiPActive = false;
      this.separatePiPActive = false;
      this.isGhost = false;
      this.topMost = false;
      this.currentTrack = null;
      this.bridgeStreamReady = false;
      this.isSyncingBridge = false;

      this._bindSeparatePiPEvents();
      this._bindMediaSessionHandlers();
    }

    initSyncWithDesktop() {
      if (this.bridge.isDesktop) {
        this.bridge.setGlobalHotkeys(this.globalHotkeys);
        this.bridge.setPiPAspect(this.getCurrentAspectRatio(), this.autoAspectFit, false);
      }
    }

    handleDesktopWindowState(state) {
      if (!state) return;
      this.desktopPiPActive = Boolean(state.isPiP);
      this.isGhost = Boolean(state.isGhost);
      this.topMost = Boolean(state.isTopMost);
      if (typeof state.opacity === 'number' && Number.isFinite(state.opacity)) {
        this.opacity = state.opacity;
      }
      if (typeof state.globalHotkeysEnabled === 'boolean') {
        this.globalHotkeys = state.globalHotkeysEnabled;
      }

      this.appRoot.dataset.desktopPip = this.desktopPiPActive ? 'true' : 'false';
      this.appRoot.dataset.ghost = this.isGhost ? 'true' : 'false';
      this.appRoot.dataset.topmost = this.topMost ? 'true' : 'false';
      this.appRoot.dataset.maximized = state.isMaximized ? 'true' : 'false';
      this.appRoot.dataset.fullscreen = state.isFullscreen ? 'true' : 'false';

      const ghostBanner = document.getElementById('pip-ghost-banner');
      if (ghostBanner) {
        ghostBanner.classList.toggle('hidden', !(this.desktopPiPActive && this.isGhost));
      }

      if (this.visualizer) {
        this.visualizer.setDesktopPiP(this.desktopPiPActive);
      }
    }

    getPreferredMode() {
      return this.preferredMode;
    }

    setPreferredMode(mode) {
      if (mode === 'desktop' && !this.bridge.isDesktop) {
        this.onToast('데스크톱 모드는 실행 파일(AETHER Player.exe)에서 지원됩니다.', 'warn');
        this.preferredMode = 'separate';
      } else {
        this.preferredMode = mode === 'separate' ? 'separate' : 'desktop';
      }
      Aether.utils.storage.set('pipMode', this.preferredMode);
    }

    setOpacity(val) {
      const clamped = Math.max(0.35, Math.min(1.0, Number(val) || 1.0));
      this.opacity = clamped;
      Aether.utils.storage.set('pipOpacity', clamped);
      if (this.bridge.isDesktop) {
        this.bridge.setPiPOpacity(clamped);
      }
    }

    setAutoAspectFit(enabled) {
      this.autoAspectFit = Boolean(enabled);
      Aether.utils.storage.set('pipAutoAspect', this.autoAspectFit);
      if (this.bridge.isDesktop) {
        this.bridge.setPiPAspect(this.getCurrentAspectRatio(), this.autoAspectFit, this.desktopPiPActive && this.autoAspectFit);
      }
    }

    setGlobalHotkeys(enabled) {
      this.globalHotkeys = Boolean(enabled);
      Aether.utils.storage.set('globalHotkeys', this.globalHotkeys);
      if (this.bridge.isDesktop) {
        this.bridge.setGlobalHotkeys(this.globalHotkeys);
      }
    }

    toggleTopMost() {
      if (!this.bridge.isDesktop) {
        this.onToast('항상 위 고정은 데스크톱 앱에서 지원됩니다.', 'warn');
        return;
      }
      const next = !this.topMost;
      this.bridge.setTopMost(next);
      this.onToast(next ? '창을 항상 위에 고정했습니다' : '창 항상 위 고정을 해제했습니다', 'accent');
    }

    getCurrentAspectRatio() {
      if (this.currentTrack && this.currentTrack.kind === 'video' && this.mediaEl.videoWidth > 0 && this.mediaEl.videoHeight > 0) {
        const rot = this.getRotation();
        if (rot === 90 || rot === 270) {
          return this.mediaEl.videoHeight / this.mediaEl.videoWidth;
        }
        return this.mediaEl.videoWidth / this.mediaEl.videoHeight;
      }
      return 16 / 9;
    }

    fitCurrentAspect() {
      if (!this.bridge.isDesktop || !this.desktopPiPActive) return;
      this.bridge.fitAspect(this.getCurrentAspectRatio());
    }

    onVideoDimensionsReady() {
      if (this.bridge.isDesktop) {
        this.bridge.setPiPAspect(this.getCurrentAspectRatio(), this.autoAspectFit, this.desktopPiPActive && this.autoAspectFit);
      }
    }

    toggleGhost(force) {
      if (!this.bridge.isDesktop) {
        this.onToast('고스트 모드는 데스크톱 프로그램에서 지원됩니다.', 'warn');
        return;
      }
      if (!this.desktopPiPActive) {
        if (!this.currentTrack) {
          this.onToast('먼저 미디어를 재생한 뒤 고스트 모드를 사용하세요.', 'warn');
          return;
        }
        this.bridge.enterPiP({
          width: 460,
          height: 262,
          corner: 'br',
          opacity: Math.min(this.opacity, 0.78),
          ratio: this.autoAspectFit ? this.getCurrentAspectRatio() : 0
        });
        setTimeout(() => {
          this.bridge.setGhost(true);
          this.onToast('PIP 고스트 모드 켜짐 (Alt+Shift+G로 해제)', 'accent');
        }, 60);
        return;
      }

      const next = typeof force === 'boolean' ? force : !this.isGhost;
      this.bridge.setGhost(next);
      this.onToast(next ? '고스트 모드 켜짐 (클릭 통과 · Alt+Shift+G로 해제)' : '고스트 모드 해제됨', 'accent');
    }

    isAnyPiPActive() {
      return this.desktopPiPActive || this.separatePiPActive;
    }

    setTrack(track) {
      this.currentTrack = track;
      this._updateMediaSessionMetadata(track);

      if (track && track.kind === 'audio') {
        this._prepareAudioBridge();
        if (this.bridge.isDesktop) {
          this.bridge.setPiPAspect(16 / 9, this.autoAspectFit, this.desktopPiPActive && this.autoAspectFit);
        }
      } else if (this.visualizer) {
        this.visualizer.setBridgeActive(false);
      }

      if (this.separatePiPActive && track) {
        const pipEl = document.pictureInPictureElement;
        if (pipEl === this.mediaEl && track.kind === 'audio') {
          document.exitPictureInPicture().catch(function () {});
          this.onToast('오디오 트랙으로 전환되어 분리형 PIP를 종료했습니다. [P]로 다시 열 수 있습니다.', 'warn');
        } else if (pipEl === this.bridgeVideo && track.kind === 'video') {
          document.exitPictureInPicture().catch(function () {});
          this.onToast('영상 트랙으로 전환되어 분리형 PIP를 종료했습니다. [P]로 다시 열 수 있습니다.', 'warn');
        }
      }
    }

    onPlaybackStateChange(playing) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }

      if (this.currentTrack && this.currentTrack.kind === 'audio' && this.bridgeStreamReady) {
        this.isSyncingBridge = true;
        if (playing) {
          this.bridgeVideo.play().catch(function () {});
        } else if (!this.bridgeVideo.paused) {
          this.bridgeVideo.pause();
        }
        setTimeout(() => {
          this.isSyncingBridge = false;
        }, 40);
      }
    }

    updatePositionState() {
      if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
      const dur = this.mediaEl.duration;
      const cur = this.mediaEl.currentTime;
      if (Number.isFinite(dur) && dur > 0 && Number.isFinite(cur) && cur >= 0 && cur <= dur) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: this.mediaEl.playbackRate || 1,
            position: cur
          });
        } catch { }
      }
    }

    toggle(forceMode) {
      if (!this.currentTrack) {
        this.onToast('먼저 미디어 파일을 열거나 데모를 재생해 주세요.', 'warn');
        return;
      }

      if (this.desktopPiPActive || this.separatePiPActive) {
        this.exit();
        return;
      }

      const mode = forceMode || this.preferredMode;
      if (mode === 'desktop' && this.bridge.isDesktop) {
        this.bridge.enterPiP({
          width: 460,
          height: 262,
          corner: 'br',
          opacity: this.opacity,
          ratio: this.autoAspectFit ? this.getCurrentAspectRatio() : 0
        });
        return;
      }

      this._enterSeparatePiP();
    }

    exit() {
      if (this.desktopPiPActive && this.bridge.isDesktop) {
        this.bridge.exitPiP();
      }
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(function () {});
      }
    }

    _prepareAudioBridge() {
      if (!this.bridgeCanvas || !this.bridgeVideo) return;
      if (this.visualizer) {
        this.visualizer.renderBridgeFrame(performance.now());
      }
      if (!this.bridgeStreamReady && typeof this.bridgeCanvas.captureStream === 'function') {
        const stream = this.bridgeCanvas.captureStream(30);
        this.bridgeVideo.srcObject = stream;
        this.bridgeStreamReady = true;
      }
      if (!this.mediaEl.paused) {
        this.bridgeVideo.play().catch(function () {});
      }
    }

    _enterSeparatePiP() {
      if (!document.pictureInPictureEnabled) {
        this.onToast('이 환경에서 분리형 OS PIP가 지원되지 않습니다.', 'warn');
        return;
      }

      if (this.currentTrack.kind === 'audio') {
        this._prepareAudioBridge();
        if (this.visualizer) this.visualizer.setBridgeActive(true);
        if (this.bridgeVideo.paused) {
          this.bridgeVideo.play().catch(function () {});
        }
        this.bridgeVideo.requestPictureInPicture()
          .then(() => {
            this.onToast('오디오 분리형 OS PIP가 실행되었습니다', 'accent');
          })
          .catch((err) => {
            if (this.visualizer) this.visualizer.setBridgeActive(false);
            this.onToast('분리형 PIP 실행 실패: ' + (err && err.message ? err.message : '브라우저 제한'), 'warn');
          });
        return;
      }

      if (this.mediaEl.readyState < 1) {
        this.onToast('영상을 불러오는 중입니다. 잠시 후 다시 시도하세요.', 'warn');
        return;
      }

      this.mediaEl.requestPictureInPicture()
        .then(() => {
          this.onToast('분리형 OS PIP 창이 열렸습니다', 'accent');
        })
        .catch((err) => {
          this.onToast('분리형 PIP 실행 실패: ' + (err && err.message ? err.message : '권한 필요'), 'warn');
        });
    }

    _bindSeparatePiPEvents() {
      const onEnter = () => {
        this.separatePiPActive = true;
        this.appRoot.dataset.separatePip = 'true';
        const placeholder = document.getElementById('pip-active-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
        if (document.pictureInPictureElement === this.bridgeVideo && this.visualizer) {
          this.visualizer.setBridgeActive(true);
        }
      };

      const onLeave = () => {
        this.separatePiPActive = Boolean(document.pictureInPictureElement);
        this.appRoot.dataset.separatePip = this.separatePiPActive ? 'true' : 'false';
        const placeholder = document.getElementById('pip-active-placeholder');
        if (!this.separatePiPActive && placeholder) {
          placeholder.classList.add('hidden');
        }
        if (this.visualizer && document.pictureInPictureElement !== this.bridgeVideo) {
          this.visualizer.setBridgeActive(false);
        }
      };

      this.mediaEl.addEventListener('enterpictureinpicture', onEnter);
      this.mediaEl.addEventListener('leavepictureinpicture', onLeave);
      this.bridgeVideo.addEventListener('enterpictureinpicture', onEnter);
      this.bridgeVideo.addEventListener('leavepictureinpicture', onLeave);

      this.bridgeVideo.addEventListener('play', () => {
        if (this.isSyncingBridge) return;
        if (this.currentTrack && this.currentTrack.kind === 'audio' && this.mediaEl.paused) {
          this.onTogglePlay(true);
        }
      });

      this.bridgeVideo.addEventListener('pause', () => {
        if (this.isSyncingBridge) return;
        if (this.currentTrack && this.currentTrack.kind === 'audio' && !this.mediaEl.paused && document.pictureInPictureElement === this.bridgeVideo) {
          this.onTogglePlay(false);
        }
      });
    }

    _updateMediaSessionMetadata(track) {
      if (!('mediaSession' in navigator) || !track) return;
      const artSrc = track.artworkUrl || Aether.utils.createArtworkDataUrl(track.title, track.artist, track.palette);
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || track.name,
          artist: track.artist || 'AETHER Media Studio',
          album: track.album || String(track.ext || '').toUpperCase(),
          artwork: artSrc ? [{ src: artSrc, sizes: '256x256', type: 'image/png' }] : []
        });
      } catch { }
    }

    _bindMediaSessionHandlers() {
      if (!('mediaSession' in navigator)) return;
      const safeSet = (action, handler) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch { }
      };

      safeSet('play', () => this.onTogglePlay(true));
      safeSet('pause', () => this.onTogglePlay(false));
      safeSet('previoustrack', () => this.onTrackNav(-1));
      safeSet('nexttrack', () => this.onTrackNav(1));
      safeSet('seekbackward', (details) => {
        const offset = (details && details.seekOffset) || 10;
        if (Number.isFinite(this.mediaEl.duration)) {
          this.mediaEl.currentTime = Math.max(0, this.mediaEl.currentTime - offset);
        }
      });
      safeSet('seekforward', (details) => {
        const offset = (details && details.seekOffset) || 10;
        if (Number.isFinite(this.mediaEl.duration)) {
          this.mediaEl.currentTime = Math.min(this.mediaEl.duration, this.mediaEl.currentTime + offset);
        }
      });
      safeSet('seekto', (details) => {
        if (details && Number.isFinite(details.seekTime) && Number.isFinite(this.mediaEl.duration)) {
          this.mediaEl.currentTime = details.seekTime;
        }
      });
    }
  }

  Aether.PiPManager = PiPManager;
})(window);
