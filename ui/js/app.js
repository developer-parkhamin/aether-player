(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('app-root');
    const playerStage = document.getElementById('player-stage');
    const stageMediaShell = document.getElementById('stage-media-shell');
    const workspaceGrid = document.getElementById('workspace-grid');
    const welcomeScreen = document.getElementById('welcome-screen');
    const stageTopDragStrip = document.getElementById('stage-top-drag-strip');
    const topSnapHint = document.getElementById('top-snap-hint');
    const mediaEl = document.getElementById('media-element');
    const previewVideo = document.getElementById('preview-video');
    const previewCanvas = document.getElementById('scrub-preview-canvas');
    const previewCard = document.getElementById('scrub-preview-card');
    const previewTime = document.getElementById('scrub-preview-time');
    const dropVeil = document.getElementById('global-drop-veil');

    const topHeader = document.getElementById('top-header');
    const brandLogo = document.getElementById('brand-logo');
    const welcomeBrandLogo = document.getElementById('welcome-brand-logo');
    const nowPlayingPill = document.getElementById('now-playing-pill');
    const nowPlayingBadge = document.getElementById('now-playing-badge');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingMeta = document.getElementById('now-playing-meta');
    const sleepTimerBadge = document.getElementById('sleep-timer-badge');
    const btnHome = document.getElementById('btn-home');
    const btnCloseMedia = document.getElementById('btn-close-media');
    const btnStopHome = document.getElementById('btn-stop-home');
    const btnWelcomeFolder = document.getElementById('btn-welcome-folder');
    const btnWelcomeShortcuts = document.getElementById('btn-welcome-shortcuts');
    const easterEggModal = document.getElementById('easter-egg-modal');
    const easterEggCanvas = document.getElementById('easter-egg-canvas');
    const btnEasterTheme = document.getElementById('btn-easter-theme');
    const btnEasterClose = document.getElementById('btn-easter-close');

    const audioArtImg = document.getElementById('audio-art-img');
    const audioVinylFallback = document.getElementById('audio-vinyl-fallback');
    const audioTrackBadge = document.getElementById('audio-track-badge');
    const audioTrackTitle = document.getElementById('audio-track-title');
    const audioTrackArtist = document.getElementById('audio-track-artist');
    const audioTrackAlbum = document.getElementById('audio-track-album');

    const subtitleDisplay = document.getElementById('subtitle-display');
    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const lyricPrevEl = document.getElementById('lyric-prev');
    const lyricCurrEl = document.getElementById('lyric-curr');
    const lyricNextEl = document.getElementById('lyric-next');
    const pipLyricLine = document.getElementById('pip-lyric-line');

    const scrubberTrack = document.getElementById('scrubber-track');
    const scrubberBuffered = document.getElementById('scrubber-buffered');
    const scrubberAbRange = document.getElementById('scrubber-ab-range');
    const scrubberFill = document.getElementById('scrubber-fill');
    const scrubberBookmarks = document.getElementById('scrubber-bookmarks');
    const scrubberThumb = document.getElementById('scrubber-thumb');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');

    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    const speedLabel = document.getElementById('speed-label');
    const speedPopover = document.getElementById('speed-popover');
    const vizModeLabel = document.getElementById('viz-mode-label');

    const pipPopover = document.getElementById('pip-popover');
    const pipMenuToggle = document.getElementById('btn-pip-menu-toggle');
    const pipOptDesktop = document.getElementById('pip-opt-desktop');
    const pipOptSeparate = document.getElementById('pip-opt-separate');
    const pipStatusDesktop = document.getElementById('pip-status-desktop');
    const popoverOpacitySlider = document.getElementById('popover-opacity-slider');
    const popoverOpacityValue = document.getElementById('popover-opacity-value');
    const togglePipAutoAspect = document.getElementById('toggle-pip-auto-aspect');
    const togglePipGhost = document.getElementById('toggle-pip-ghost');
    const toggleGlobalHotkeys = document.getElementById('toggle-global-hotkeys');
    const toggleTopmostPin = document.getElementById('toggle-topmost-pin');

    const pipHudTop = document.getElementById('pip-hud-top');
    const pipHudBadge = document.getElementById('pip-hud-badge');
    const pipHudTitle = document.getElementById('pip-hud-title');
    const pipScrubberTrack = document.getElementById('pip-scrubber-track');
    const pipScrubberFill = document.getElementById('pip-scrubber-fill');
    const pipTimeText = document.getElementById('pip-time-text');
    const pipVolSlider = document.getElementById('pip-vol-slider');
    const btnPipSpeed = document.getElementById('btn-pip-speed');
    const pipOpacitySlider = document.getElementById('pip-opacity-slider');
    const pipOpacityLabel = document.getElementById('pip-opacity-label');

    const toolsPopover = document.getElementById('tools-popover');
    const btnTools = document.getElementById('btn-tools');
    const abStatusLabel = document.getElementById('ab-status-label');
    const bookmarkList = document.getElementById('bookmark-list');
    const vidFitLabel = document.getElementById('vid-fit-label');
    const filterBrightness = document.getElementById('filter-brightness');
    const filterBrightnessVal = document.getElementById('filter-brightness-val');
    const filterContrast = document.getElementById('filter-contrast');
    const filterContrastVal = document.getElementById('filter-contrast-val');
    const filterSaturation = document.getElementById('filter-saturation');
    const filterSaturationVal = document.getElementById('filter-saturation-val');
    const subSyncVal = document.getElementById('sub-sync-val');
    const subSizeSelect = document.getElementById('sub-size-select');
    const subPosSlider = document.getElementById('sub-pos-slider');
    const subBgSlider = document.getElementById('sub-bg-slider');
    const sleepActionSelect = document.getElementById('sleep-action-select');
    const fileAssocStatus = document.getElementById('file-assoc-status');
    const btnFileAssoc = document.getElementById('btn-file-assoc');
    const btnFileAssocSettings = document.getElementById('btn-file-assoc-settings');

    const updateBanner = document.getElementById('update-banner');
    const updateBannerText = document.getElementById('update-banner-text');
    const updateProgressBar = document.getElementById('update-progress-bar');
    const updateProgressFill = document.getElementById('update-progress-fill');
    const btnBannerUpdate = document.getElementById('btn-banner-update');
    const btnBannerDismiss = document.getElementById('btn-banner-dismiss');

    const appVersionBadge = document.getElementById('app-version-badge');
    const updateStatusBadge = document.getElementById('update-status-badge');
    const updateSourceSelect = document.getElementById('update-source-select');
    const updateEndpointInput = document.getElementById('update-endpoint-input');
    const toggleAutoUpdate = document.getElementById('toggle-auto-update');
    const btnUpdateSave = document.getElementById('btn-update-save');
    const btnUpdateCheck = document.getElementById('btn-update-check');
    const btnUpdateInstall = document.getElementById('btn-update-install');
    const updateStatusDetail = document.getElementById('update-status-detail');

    const recentHistorySection = document.getElementById('recent-history-section');
    const recentHistoryGrid = document.getElementById('recent-history-grid');

    const eqPopover = document.getElementById('eq-popover');
    const btnEq = document.getElementById('btn-eq');
    const boostSlider = document.getElementById('boost-slider');
    const boostValue = document.getElementById('boost-value');

    const shortcutsModal = document.getElementById('shortcuts-modal');
    const btnShortcuts = document.getElementById('btn-shortcuts');
    const btnPlaylistToggle = document.getElementById('btn-playlist-toggle');
    const playlistCountBadge = document.getElementById('playlist-count-badge');
    const playlistEmpty = document.getElementById('playlist-empty');
    const playlistItemsEl = document.getElementById('playlist-items');
    const playlistSearch = document.getElementById('playlist-search');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnRepeat = document.getElementById('btn-repeat');

    const fileInput = document.getElementById('file-input');
    const subtitleInput = document.getElementById('subtitle-input');
    const lyricsInput = document.getElementById('lyrics-input');
    const stageClickZone = document.getElementById('stage-click-zone');
    const gestureHud = document.getElementById('gesture-hud');
    const gestureIcon = document.getElementById('gesture-icon');
    const gestureLabel = document.getElementById('gesture-label');
    const toastContainer = document.getElementById('toast-container');

    const pipPlaceholderTitle = document.getElementById('pip-placeholder-title');
    const btnPinTopmost = document.getElementById('btn-pin-topmost');
    const btnAmbilight = document.getElementById('btn-ambilight');

    let idleTimer = 0;
    let gestureTimer = 0;
    let clickTimer = 0;
    let dragDepth = 0;
    let activeTrack = null;
    let isScrubbing = false;
    let previewUrl = '';
    let lastPreviewSeek = 0;
    let pendingPreviewTime = null;

    // Pro feature states
    let subtitleEnabled = true;
    let subtitleOffset = 0;
    let loopA = null;
    let loopB = null;
    let rotationDeg = 0;
    let flipH = false;
    const FIT_MODES = [
      { id: 'contain', label: '맞춤' },
      { id: 'cover', label: '채우기' },
      { id: 'fill', label: '늘리기' }
    ];
    let fitModeIdx = 0;
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;
    let pendingResumeApplied = false;
    let lastResumeSavedAt = 0;
    let assocRegistered = false;

    let sleepMode = '0'; // '0' | '15' | '30' | '60' | 'track'
    let sleepEndTs = 0;
    let sleepIntervalId = 0;

    let resumeMap = Aether.utils.storage.get('resumeMap', {});
    let recentHistory = Aether.utils.storage.get('recentHistory', []);
    let bookmarksMap = Aether.utils.storage.get('bookmarksMap', {});

    function showToast(text, tone) {
      const item = document.createElement('div');
      item.className = 'toast-item' + (tone ? ' toast-' + tone : '');
      item.textContent = text;
      toastContainer.appendChild(item);
      setTimeout(() => {
        item.style.opacity = '0';
        item.style.transition = 'opacity 200ms ease';
        setTimeout(() => item.remove(), 220);
      }, 2700);
    }

    function showGesture(svgMarkup, label) {
      gestureIcon.innerHTML = svgMarkup;
      gestureLabel.textContent = label;
      gestureHud.classList.add('visible');
      clearTimeout(gestureTimer);
      gestureTimer = setTimeout(() => gestureHud.classList.remove('visible'), 680);
    }

    const ICONS = {
      play: '<svg class="icon" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>',
      pause: '<svg class="icon" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/></svg>',
      back: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
      fwd: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
      vol: '<svg class="icon" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
    };

    const audioEngine = new Aether.AudioEngine();
    const visualizer = new Aether.Visualizer({
      canvas: document.getElementById('audio-visualizer-canvas'),
      ambilightCanvas: document.getElementById('ambilight-canvas'),
      bridgeCanvas: document.getElementById('pip-bridge-canvas'),
      mediaEl: mediaEl,
      audioEngine: audioEngine
    });
    visualizer.start();

    const savedViz = Aether.utils.storage.get('vizMode', 'aurora');
    vizModeLabel.textContent = visualizer.setMode(savedViz).label;

    const savedAmbilight = Aether.utils.storage.get('ambilight', true);
    appRoot.dataset.ambilight = savedAmbilight ? 'true' : 'false';
    visualizer.setAmbilightEnabled(savedAmbilight);
    btnAmbilight.classList.toggle('active', savedAmbilight);
    btnAmbilight.setAttribute('aria-pressed', String(savedAmbilight));

    const pipManager = new Aether.PiPManager({
      appRoot: appRoot,
      mediaEl: mediaEl,
      bridgeCanvas: document.getElementById('pip-bridge-canvas'),
      bridgeVideo: document.getElementById('pip-bridge-video'),
      visualizer: visualizer,
      bridge: Aether.bridge,
      getRotation: () => rotationDeg,
      onToast: showToast,
      onTrackNav: (dir) => (dir < 0 ? playlist.prev() : playlist.next(false)),
      onTogglePlay: (force) => togglePlay(force)
    });

    const playlist = new Aether.PlaylistManager({
      onChange: renderPlaylist,
      onSelect: (track, idx, metaOnly) => {
        if (metaOnly) {
          applyTrackHeaderAndOverlay(track);
          return;
        }
        loadTrack(track);
      },
      onSidecarAttached: (track, kind) => {
        if (activeTrack && activeTrack.id === track.id) {
          if (kind === 'subtitle') updateSubtitleRender();
          if (kind === 'lyrics') updateLyricsRender();
        }
      },
      onToast: showToast
    });

    const savedVol = Aether.utils.storage.get('volume', 0.85);
    mediaEl.volume = Math.max(0, Math.min(1, savedVol));
    syncVolumeUI();

    const savedSpeed = Aether.utils.storage.get('speed', 1.0);
    setPlaybackSpeed(savedSpeed, true);

    if (Aether.bridge.isDesktop) {
      Aether.bridge.getAssocStatus();
    } else {
      pipStatusDesktop.textContent = '앱 전용';
      pipStatusDesktop.className = 'status-tag status-off';
      pipOptDesktop.disabled = true;
      fileAssocStatus.textContent = '앱 전용';
      btnFileAssoc.disabled = true;
      btnFileAssocSettings.disabled = true;
    }

    // Native Bridge IPC Handlers
    Aether.bridge.on('window:state', (state) => {
      pipManager.handleDesktopWindowState(state);
      syncPiPControlsUI();
      applyVideoTransform();
    });

    Aether.bridge.on('window:topSnapHint', (msg) => {
      topSnapHint.classList.toggle('hidden', !(msg && msg.active));
    });

    Aether.bridge.on('files:opened', (msg) => {
      if (msg && Array.isArray(msg.files)) {
        playlist.addNativeDescriptors(msg.files, msg.startIndex);
      }
    });

    Aether.bridge.on('assoc:state', (msg) => {
      assocRegistered = Boolean(msg && msg.registered);
      const defCnt = msg && typeof msg.defaultCount === 'number' ? msg.defaultCount : 0;
      const totCnt = msg && typeof msg.totalCoreCount === 'number' ? msg.totalCoreCount : 5;
      if (assocRegistered && totCnt > 0 && defCnt >= totCnt) {
        fileAssocStatus.textContent = '모두 기본 적용';
        fileAssocStatus.className = 'status-tag status-ok';
      } else if (assocRegistered) {
        fileAssocStatus.textContent = '등록됨 (' + defCnt + '/' + totCnt + ' 기본)';
        fileAssocStatus.className = 'status-tag status-ok';
      } else {
        fileAssocStatus.textContent = '미등록';
        fileAssocStatus.className = 'status-tag';
      }
      btnFileAssoc.textContent = assocRegistered ? '연결 해제' : '연결 프로그램 등록';
      btnFileAssoc.classList.toggle('tool-pill-accent', !assocRegistered);
      btnFileAssocSettings.classList.toggle('tool-pill-accent', !assocRegistered || defCnt < totCnt);
    });

    Aether.bridge.on('hotkey:pip', () => pipManager.toggle());
    Aether.bridge.on('hotkey:ghost', () => pipManager.toggleGhost());
    Aether.bridge.on('hotkey:play', () => { if (activeTrack) togglePlay(); });
    Aether.bridge.on('toast', (msg) => { if (msg && msg.text) showToast(msg.text, msg.tone || 'accent'); });

    function updateEndpointPlaceholder() {
      updateEndpointInput.placeholder = updateSourceSelect.value === 'feed'
        ? '예: https://example.com/aether/latest.json'
        : '예: username/aether-player';
    }

    Aether.bridge.on('update:config', (cfg) => {
      if (!cfg) return;
      if (cfg.currentVersion) appVersionBadge.textContent = 'v' + cfg.currentVersion;
      updateSourceSelect.value = cfg.sourceType === 'feed' ? 'feed' : 'github';
      updateEndpointInput.value = updateSourceSelect.value === 'feed' ? (cfg.feedUrl || '') : (cfg.githubRepo || '');
      toggleAutoUpdate.checked = cfg.autoCheckOnStartup !== false;
      updateEndpointPlaceholder();

      const builtIn = Boolean(cfg.isBuiltInSource);
      updateSourceSelect.disabled = builtIn;
      updateEndpointInput.disabled = builtIn;
      btnUpdateSave.classList.toggle('hidden', builtIn);
      if (builtIn) {
        updateStatusDetail.textContent = '내장된 공식 업데이트 채널이 연결되어 있습니다.';
      }
    });

    Aether.bridge.on('update:status', (res) => {
      btnUpdateCheck.disabled = false;
      btnUpdateCheck.textContent = '업데이트 확인';
      btnBannerUpdate.disabled = false;
      btnUpdateInstall.disabled = false;

      if (!res) return;
      if (!res.hasConfig) {
        updateStatusBadge.textContent = '미설정';
        updateStatusBadge.className = 'status-tag';
        updateStatusDetail.textContent = res.error || 'GitHub 저장소 또는 JSON 피드 URL을 입력하세요.';
        btnUpdateInstall.classList.add('hidden');
        return;
      }

      if (!res.success) {
        updateStatusBadge.textContent = '오류';
        updateStatusBadge.className = 'status-tag status-off';
        updateStatusDetail.textContent = res.error || '업데이트 확인 중 오류가 발생했습니다.';
        btnUpdateInstall.classList.add('hidden');
        return;
      }

      if (res.updateAvailable) {
        updateStatusBadge.textContent = 'v' + res.latestVersion + ' 출시';
        updateStatusBadge.className = 'status-tag status-ok';
        const snippet = res.notes ? (' — ' + res.notes.replace(/\s+/g, ' ').slice(0, 90)) : '';
        updateStatusDetail.textContent = '새 버전 v' + res.latestVersion + '을 설치할 수 있습니다.' + snippet;
        btnUpdateInstall.classList.remove('hidden');

        updateBannerText.textContent = '새 버전 v' + res.latestVersion + ' 업데이트가 준비되었습니다';
        updateProgressBar.classList.add('hidden');
        btnBannerUpdate.textContent = '지금 업데이트';
        updateBanner.classList.remove('hidden');
        if (res.silent) {
          showToast('새 버전 v' + res.latestVersion + ' 업데이트가 있습니다', 'accent');
        }
      } else {
        updateStatusBadge.textContent = '최신 버전';
        updateStatusBadge.className = 'status-tag status-ok';
        updateStatusDetail.textContent = '현재 최신 버전(v' + (res.currentVersion || '2.3.0') + ')을 사용 중입니다.';
        btnUpdateInstall.classList.add('hidden');
        if (!res.silent) showToast('현재 최신 버전입니다', 'accent');
      }
    });

    Aether.bridge.on('update:progress', (prog) => {
      if (!prog) return;
      const pct = Math.max(0, Math.min(100, Number(prog.percent) || 0));
      updateBanner.classList.remove('hidden');
      updateProgressBar.classList.remove('hidden');
      updateProgressFill.style.width = pct + '%';
      updateBannerText.textContent = '업데이트 다운로드 중... ' + pct + '%';
      updateStatusBadge.textContent = pct + '%';
      updateStatusDetail.textContent = '설치 파일 다운로드 중 (' + pct + '%) — 완료 후 자동으로 재시작됩니다.';
    });

    updateSourceSelect.addEventListener('change', () => {
      updateEndpointPlaceholder();
    });

    function collectAndSaveUpdateConfig() {
      const mode = updateSourceSelect.value === 'feed' ? 'feed' : 'github';
      const val = updateEndpointInput.value.trim();
      Aether.bridge.saveUpdateConfig({
        sourceType: mode,
        githubRepo: mode === 'github' ? val : '',
        feedUrl: mode === 'feed' ? val : '',
        autoCheckOnStartup: toggleAutoUpdate.checked
      });
    }

    btnUpdateSave.addEventListener('click', () => {
      if (!Aether.bridge.isDesktop) return;
      collectAndSaveUpdateConfig();
    });

    btnUpdateCheck.addEventListener('click', () => {
      if (!Aether.bridge.isDesktop) {
        showToast('자동 업데이트는 데스크톱 앱에서 지원됩니다', 'warn');
        return;
      }
      collectAndSaveUpdateConfig();
      btnUpdateCheck.disabled = true;
      btnUpdateCheck.textContent = '확인 중...';
      updateStatusBadge.textContent = '확인 중';
      Aether.bridge.checkUpdates();
    });

    function startUpdateDownload() {
      if (!Aether.bridge.isDesktop) return;
      btnBannerUpdate.disabled = true;
      btnBannerUpdate.textContent = '다운로드 중...';
      btnUpdateInstall.disabled = true;
      updateProgressBar.classList.remove('hidden');
      Aether.bridge.downloadAndInstallUpdate();
    }

    btnUpdateInstall.addEventListener('click', startUpdateDownload);
    btnBannerUpdate.addEventListener('click', startUpdateDownload);
    btnBannerDismiss.addEventListener('click', () => updateBanner.classList.add('hidden'));

    Aether.bridge.ready();
    pipManager.initSyncWithDesktop();
    syncPiPControlsUI();
    renderRecentHistory();
    applySubtitleStyleFromControls();

    // =========================================================================
    // Resume & Recent History Helpers
    // =========================================================================
    function getTrackStorageKey(track) {
      if (!track || track.isDemo || track.isLiveStream) return '';
      if (track.path) return 'path:' + track.path.toLowerCase();
      return 'file:' + track.name + ':' + (track.size || 0);
    }

    function saveCurrentResumeState(force) {
      if (!activeTrack || !Number.isFinite(mediaEl.duration) || mediaEl.duration < 10) return;
      const key = getTrackStorageKey(activeTrack);
      if (!key) return;
      const now = Date.now();
      if (!force && now - lastResumeSavedAt < 2500) return;
      lastResumeSavedAt = now;

      const cur = mediaEl.currentTime;
      const dur = mediaEl.duration;
      if (cur > 5 && cur < dur - 5) {
        resumeMap[key] = { time: cur, duration: dur, updatedAt: now };
      } else if (cur >= dur - 5) {
        delete resumeMap[key];
      }
      Aether.utils.storage.set('resumeMap', resumeMap);

      if (activeTrack.path) {
        recordRecentHistory(activeTrack, cur, dur);
      }
    }

    function recordRecentHistory(track, time, duration) {
      if (!track || !track.path) return;
      recentHistory = recentHistory.filter((r) => r.path.toLowerCase() !== track.path.toLowerCase());
      recentHistory.unshift({
        path: track.path,
        name: track.name,
        title: track.title || track.name,
        ext: track.ext,
        time: Number.isFinite(time) ? time : 0,
        duration: Number.isFinite(duration) ? duration : 0,
        updatedAt: Date.now()
      });
      if (recentHistory.length > 6) recentHistory.length = 6;
      Aether.utils.storage.set('recentHistory', recentHistory);
      renderRecentHistory();
    }

    function renderRecentHistory() {
      recentHistoryGrid.innerHTML = '';
      if (!recentHistory.length || !Aether.bridge.isDesktop) {
        recentHistorySection.classList.add('hidden');
        return;
      }
      recentHistorySection.classList.remove('hidden');

      recentHistory.forEach((entry) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'recent-card';

        const key = 'path:' + entry.path.toLowerCase();
        const saved = resumeMap[key];
        const t = saved ? saved.time : entry.time;
        const d = saved ? saved.duration : entry.duration;
        const pct = d > 0 ? Math.min(100, Math.round((t / d) * 100)) : 0;

        const top = document.createElement('div');
        top.className = 'recent-card-top';
        const badge = document.createElement('span');
        badge.className = 'format-badge';
        badge.dataset.ext = String(entry.ext || '').toLowerCase();
        badge.textContent = String(entry.ext || 'FILE').toUpperCase();

        const tm = document.createElement('span');
        tm.className = 'recent-card-time mono';
        tm.textContent = t > 5 ? Aether.utils.formatTime(t) + ' 이어보기' : '처음부터';

        top.appendChild(badge);
        top.appendChild(tm);

        const ttl = document.createElement('div');
        ttl.className = 'recent-card-title';
        ttl.textContent = entry.title;

        const bar = document.createElement('div');
        bar.className = 'recent-progress-bar';
        const fill = document.createElement('div');
        fill.className = 'recent-progress-fill';
        fill.style.width = pct + '%';
        bar.appendChild(fill);

        btn.appendChild(top);
        btn.appendChild(ttl);
        btn.appendChild(bar);
        btn.addEventListener('click', () => {
          Aether.bridge.openPaths([entry.path]);
        });
        recentHistoryGrid.appendChild(btn);
      });
    }

    document.getElementById('btn-clear-history').addEventListener('click', () => {
      recentHistory = [];
      resumeMap = {};
      Aether.utils.storage.set('recentHistory', []);
      Aether.utils.storage.set('resumeMap', {});
      renderRecentHistory();
      showToast('최근 재생 기록을 초기화했습니다');
    });

    // =========================================================================
    // Playback & Track Lifecycle
    // =========================================================================
    function closeMediaToHome() {
      if (!activeTrack) return;
      saveCurrentResumeState(true);
      if (pipManager.isAnyPiPActive()) {
        pipManager.exit();
      }
      playlist.activeIndex = -1;
      loadTrack(null);
      renderPlaylist();
      renderRecentHistory();
      showToast('재생을 종료하고 메인화면으로 돌아왔습니다', 'accent');
    }

    function loadTrack(track) {
      saveCurrentResumeState(true);

      if (activeTrack && activeTrack.isDemo && activeTrack.setDemoPlaying && (!track || track.id !== activeTrack.id)) {
        activeTrack.setDemoPlaying(false);
      }

      activeTrack = track;
      btnHome.classList.toggle('hidden', !track);
      pendingResumeApplied = false;
      clearAbLoop(true);
      subtitleOffset = 0;
      subSyncVal.textContent = '0.0s';
      subtitleDisplay.classList.add('hidden');
      subtitleDisplay.textContent = '';
      lyricsOverlay.classList.add('hidden');
      pipLyricLine.classList.add('hidden');

      if (!track) {
        mediaEl.pause();
        mediaEl.srcObject = null;
        mediaEl.removeAttribute('src');
        mediaEl.load();
        appRoot.dataset.mediaKind = 'empty';
        appRoot.dataset.playing = 'false';
        nowPlayingPill.classList.add('hidden');
        Aether.bridge.setTitle('AETHER Player');
        visualizer.setTrackContext({ kind: 'empty', title: 'AETHER Studio', artist: '', activeLyric: '' });
        updateScrubberUI(0, 0);
        renderBookmarks();
        return;
      }

      appRoot.dataset.mediaKind = track.kind;
      applyTrackHeaderAndOverlay(track);

      if (track.stream) {
        mediaEl.removeAttribute('src');
        mediaEl.srcObject = track.stream;
        mediaEl.muted = true;
      } else {
        mediaEl.srcObject = null;
        mediaEl.muted = appRoot.dataset.muted === 'true';
        mediaEl.src = track.url;
      }

      audioEngine.setBoost(Number(boostSlider.value));
      setupPreviewSource(track);
      pipManager.setTrack(track);
      mediaEl.playbackRate = Number(speedLabel.textContent.replace('×', '')) || 1;
      applyVideoTransform();
      renderBookmarks();
      updateLyricsRender();
      updateSubtitleRender();

      if (track.path) {
        recordRecentHistory(track, 0, track.duration || 0);
      }

      audioEngine.ensureInitialized(mediaEl);
      audioEngine.resume();
      mediaEl.play().catch(function () {});
      resetIdleTimer();
    }

    function applyTrackHeaderAndOverlay(track) {
      if (!track) return;
      nowPlayingPill.classList.remove('hidden');
      nowPlayingBadge.textContent = String(track.ext || track.kind).toUpperCase();
      nowPlayingBadge.dataset.ext = String(track.ext || '').toLowerCase();
      nowPlayingTitle.textContent = track.title || track.name;
      const metaParts = [];
      if (track.width > 0 && track.height > 0) metaParts.push(track.width + '×' + track.height);
      if (track.size > 0) metaParts.push(Aether.utils.formatBytes(track.size));
      nowPlayingMeta.textContent = metaParts.join(' · ');

      pipHudBadge.textContent = nowPlayingBadge.textContent;
      pipHudBadge.dataset.ext = nowPlayingBadge.dataset.ext;
      pipHudTitle.textContent = track.title || track.name;
      pipPlaceholderTitle.textContent = track.title || track.name;
      Aether.bridge.setTitle(track.title || track.name);

      if (track.kind === 'audio') {
        audioTrackBadge.textContent = String(track.ext || 'MP3').toUpperCase();
        audioTrackBadge.dataset.ext = String(track.ext || 'mp3').toLowerCase();
        audioTrackTitle.textContent = track.title || track.name;
        audioTrackArtist.textContent = track.artist || '아티스트 정보 없음';
        audioTrackAlbum.textContent = track.album || '';

        if (track.artworkUrl) {
          audioArtImg.src = track.artworkUrl;
          audioArtImg.classList.remove('hidden');
          audioVinylFallback.classList.add('hidden');
        } else {
          audioArtImg.removeAttribute('src');
          audioArtImg.classList.add('hidden');
          audioVinylFallback.classList.remove('hidden');
        }
      }

      visualizer.setTrackContext({
        kind: track.kind,
        ext: track.ext,
        title: track.title || track.name,
        artist: track.artist || '',
        palette: track.palette,
        artworkEl: track.artworkUrl ? audioArtImg : null
      });
    }

    function togglePlay(forcePlay) {
      if (!activeTrack) return;
      audioEngine.ensureInitialized(mediaEl);
      audioEngine.resume();
      const shouldPlay = typeof forcePlay === 'boolean' ? forcePlay : mediaEl.paused;
      if (shouldPlay) {
        mediaEl.play().catch(function () {});
        showGesture(ICONS.play, '재생');
      } else {
        mediaEl.pause();
        showGesture(ICONS.pause, '일시정지');
      }
    }

    function seekRelative(delta) {
      if (!activeTrack || !Number.isFinite(mediaEl.duration)) return;
      mediaEl.currentTime = Math.max(0, Math.min(mediaEl.duration, mediaEl.currentTime + delta));
      showGesture(delta < 0 ? ICONS.back : ICONS.fwd, (delta > 0 ? '+' : '') + delta + '초');
    }

    function setVolume(val) {
      const v = Math.max(0, Math.min(1, Number(val)));
      mediaEl.volume = v;
      if (v > 0 && appRoot.dataset.muted === 'true') {
        appRoot.dataset.muted = 'false';
        if (!(activeTrack && activeTrack.stream)) mediaEl.muted = false;
      }
      Aether.utils.storage.set('volume', v);
      syncVolumeUI();
      if (activeTrack && activeTrack.updateDemoVolume) activeTrack.updateDemoVolume();
    }

    function toggleMute() {
      if (activeTrack && activeTrack.stream) {
        appRoot.dataset.muted = appRoot.dataset.muted === 'true' ? 'false' : 'true';
        if (activeTrack.updateDemoVolume) activeTrack.updateDemoVolume();
        return;
      }
      mediaEl.muted = !mediaEl.muted;
      syncVolumeUI();
    }

    function syncVolumeUI() {
      const pct = Math.round(mediaEl.volume * 100);
      volumeSlider.value = String(pct);
      volumeValue.textContent = pct + '%';
      pipVolSlider.value = String(pct);
      const isMuted = (activeTrack && activeTrack.stream)
        ? appRoot.dataset.muted === 'true'
        : (mediaEl.muted || mediaEl.volume === 0);
      appRoot.dataset.muted = isMuted ? 'true' : 'false';
    }

    function setPlaybackSpeed(rate, silent) {
      const clamped = Math.max(0.25, Math.min(3.0, Math.round(Number(rate) * 100) / 100));
      mediaEl.playbackRate = clamped;
      const text = clamped.toFixed(clamped % 1 === 0 ? 1 : 2).replace(/0$/, '') + '×';
      speedLabel.textContent = text;
      btnPipSpeed.textContent = text;
      Aether.utils.storage.set('speed', clamped);
      document.querySelectorAll('.speed-opt').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.speed) === clamped);
      });
      pipManager.updatePositionState();
      if (!silent) showToast('재생 속도 ' + text);
    }

    function cycleSpeed() {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      const cur = mediaEl.playbackRate || 1;
      const idx = speeds.indexOf(cur);
      setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
    }

    function updateScrubberUI(cur, dur) {
      const finite = Number.isFinite(dur) && dur > 0;
      const pct = finite ? Math.max(0, Math.min(100, (cur / dur) * 100)) : (activeTrack && activeTrack.isLiveStream ? 100 : 0);
      scrubberFill.style.width = pct + '%';
      scrubberThumb.style.left = pct + '%';
      pipScrubberFill.style.width = pct + '%';

      const curText = Aether.utils.formatTime(cur);
      const totText = activeTrack && activeTrack.isLiveStream ? 'LIVE' : Aether.utils.formatTime(dur);
      timeCurrent.textContent = curText;
      timeTotal.textContent = totText;
      pipTimeText.textContent = curText + ' / ' + totText;
    }

    // Media Element Listeners
    mediaEl.addEventListener('play', () => {
      appRoot.dataset.playing = 'true';
      if (activeTrack && activeTrack.setDemoPlaying) activeTrack.setDemoPlaying(true);
      pipManager.onPlaybackStateChange(true);
      pipManager.updatePositionState();
      resetIdleTimer();
    });

    mediaEl.addEventListener('pause', () => {
      appRoot.dataset.playing = 'false';
      if (activeTrack && activeTrack.setDemoPlaying) activeTrack.setDemoPlaying(false);
      pipManager.onPlaybackStateChange(false);
      pipManager.updatePositionState();
      saveCurrentResumeState(true);
      playerStage.classList.remove('controls-idle');
    });

    mediaEl.addEventListener('loadedmetadata', () => {
      if (!activeTrack) return;
      if (Number.isFinite(mediaEl.duration)) activeTrack.duration = mediaEl.duration;
      if (mediaEl.videoWidth > 0) {
        activeTrack.width = mediaEl.videoWidth;
        activeTrack.height = mediaEl.videoHeight;
        pipManager.onVideoDimensionsReady();
      } else if (!activeTrack.stream && activeTrack.kind === 'video') {
        activeTrack.kind = 'audio';
        appRoot.dataset.mediaKind = 'audio';
        pipManager.setTrack(activeTrack);
      }

      applyVideoTransform();
      applyTrackHeaderAndOverlay(activeTrack);

      if (!pendingResumeApplied) {
        pendingResumeApplied = true;
        const key = getTrackStorageKey(activeTrack);
        const saved = key ? resumeMap[key] : null;
        if (saved && Number.isFinite(mediaEl.duration) && saved.time > 5 && saved.time < mediaEl.duration - 5) {
          mediaEl.currentTime = saved.time;
          showToast('이어보기: ' + Aether.utils.formatTime(saved.time), 'accent');
        }
      }

      updateScrubberUI(mediaEl.currentTime, mediaEl.duration);
      updateAbRangeOverlay();
      renderBookmarks();
      renderPlaylist();
      pipManager.updatePositionState();
    });

    mediaEl.addEventListener('resize', () => {
      if (!activeTrack || activeTrack.kind !== 'video' || mediaEl.videoWidth <= 0) return;
      activeTrack.width = mediaEl.videoWidth;
      activeTrack.height = mediaEl.videoHeight;
      pipManager.onVideoDimensionsReady();
      applyVideoTransform();
      applyTrackHeaderAndOverlay(activeTrack);
    });

    mediaEl.addEventListener('timeupdate', () => {
      if (!isScrubbing) {
        updateScrubberUI(mediaEl.currentTime, mediaEl.duration);
      }
      if (loopA !== null && loopB !== null && mediaEl.currentTime >= loopB) {
        mediaEl.currentTime = loopA;
      }
      updateSubtitleRender();
      updateLyricsRender();
      pipManager.updatePositionState();
      saveCurrentResumeState(false);
    });

    mediaEl.addEventListener('progress', () => {
      if (!mediaEl.buffered || !mediaEl.buffered.length || !Number.isFinite(mediaEl.duration) || mediaEl.duration <= 0) {
        scrubberBuffered.style.width = '0%';
        return;
      }
      const end = mediaEl.buffered.end(mediaEl.buffered.length - 1);
      scrubberBuffered.style.width = Math.min(100, (end / mediaEl.duration) * 100) + '%';
    });

    mediaEl.addEventListener('ended', () => {
      saveCurrentResumeState(true);
      if (sleepMode === 'track') {
        executeSleepAction();
        return;
      }
      playlist.next(true);
    });

    mediaEl.addEventListener('error', () => {
      if (!activeTrack) return;
      const ext = String(activeTrack.ext || '').toLowerCase();
      if (ext.endsWith('part')) {
        showToast('미완료 .part 파일의 인덱스(moov/헤더)가 아직 기록되지 않았을 수 있습니다.', 'warn');
      } else if (ext === 'mkv') {
        showToast('이 MKV 파일의 코덱(예: AC-3/DTS 등)이 브라우저 엔진에서 지원되지 않습니다.', 'warn');
      } else {
        showToast('미디어를 재생할 수 없습니다: ' + activeTrack.name, 'warn');
      }
    });

    mediaEl.addEventListener('volumechange', syncVolumeUI);

    // =========================================================================
    // A-B Loop & Bookmarks
    // =========================================================================
    function updateAbRangeOverlay() {
      const dur = mediaEl.duration;
      if (loopA === null || !Number.isFinite(dur) || dur <= 0) {
        scrubberAbRange.classList.add('hidden');
        abStatusLabel.textContent = loopA !== null ? ('A: ' + Aether.utils.formatTime(loopA) + ' (B 미설정)') : '설정된 구간 없음';
        return;
      }
      const startPct = Math.max(0, Math.min(100, (loopA / dur) * 100));
      const endVal = loopB !== null ? loopB : loopA;
      const endPct = Math.max(startPct, Math.min(100, (endVal / dur) * 100));
      scrubberAbRange.style.left = startPct + '%';
      scrubberAbRange.style.width = Math.max(0.6, endPct - startPct) + '%';
      scrubberAbRange.classList.remove('hidden');

      abStatusLabel.textContent = loopB !== null
        ? ('반복 중: ' + Aether.utils.formatTime(loopA) + ' → ' + Aether.utils.formatTime(loopB))
        : ('A: ' + Aether.utils.formatTime(loopA) + ' (B 지점을 지정하세요)');
    }

    function setLoopA() {
      if (!activeTrack || !Number.isFinite(mediaEl.duration)) return;
      loopA = mediaEl.currentTime;
      if (loopB !== null && loopB <= loopA) loopB = null;
      updateAbRangeOverlay();
      showToast('구간 A 설정: ' + Aether.utils.formatTime(loopA), 'accent');
    }

    function setLoopB() {
      if (!activeTrack || !Number.isFinite(mediaEl.duration)) return;
      const t = mediaEl.currentTime;
      if (loopA === null) loopA = 0;
      if (t <= loopA + 0.3) {
        showToast('B 지점은 A 지점보다 뒤여야 합니다', 'warn');
        return;
      }
      loopB = t;
      updateAbRangeOverlay();
      showToast('A-B 구간 반복 시작 (' + Aether.utils.formatTime(loopA) + ' ~ ' + Aether.utils.formatTime(loopB) + ')', 'accent');
    }

    function clearAbLoop(silent) {
      loopA = null;
      loopB = null;
      updateAbRangeOverlay();
      if (!silent) showToast('구간 반복 해제됨');
    }

    function cycleAbLoop() {
      if (loopA === null) setLoopA();
      else if (loopB === null) setLoopB();
      else clearAbLoop(false);
    }

    document.getElementById('btn-ab-set-a').addEventListener('click', setLoopA);
    document.getElementById('btn-ab-set-b').addEventListener('click', setLoopB);
    document.getElementById('btn-ab-clear').addEventListener('click', () => clearAbLoop(false));

    function getTrackBookmarks() {
      const key = getTrackStorageKey(activeTrack);
      return (key && Array.isArray(bookmarksMap[key])) ? bookmarksMap[key] : [];
    }

    function addBookmark() {
      if (!activeTrack || !Number.isFinite(mediaEl.duration)) return;
      const key = getTrackStorageKey(activeTrack);
      if (!key) {
        showToast('로컬 미디어 파일에서 북마크를 저장할 수 있습니다', 'warn');
        return;
      }
      const list = getTrackBookmarks().slice();
      const t = Math.round(mediaEl.currentTime * 10) / 10;
      if (!list.some((b) => Math.abs(b.time - t) < 0.8)) {
        list.push({ id: Date.now(), time: t, label: '북마크 ' + Aether.utils.formatTime(t) });
        list.sort((a, b) => a.time - b.time);
        bookmarksMap[key] = list;
        Aether.utils.storage.set('bookmarksMap', bookmarksMap);
        renderBookmarks();
        showToast('북마크 추가: ' + Aether.utils.formatTime(t), 'accent');
      }
    }

    function renderBookmarks() {
      scrubberBookmarks.innerHTML = '';
      bookmarkList.innerHTML = '';
      const list = getTrackBookmarks();
      const dur = mediaEl.duration;

      if (!list.length) {
        bookmarkList.innerHTML = '<div class="tool-status-box">저장된 북마크가 없습니다 (단축키 B)</div>';
        return;
      }

      const key = getTrackStorageKey(activeTrack);
      list.forEach((bm) => {
        if (Number.isFinite(dur) && dur > 0) {
          const dot = document.createElement('div');
          dot.className = 'scrubber-bookmark-dot';
          dot.style.left = Math.min(100, Math.max(0, (bm.time / dur) * 100)) + '%';
          scrubberBookmarks.appendChild(dot);
        }

        const row = document.createElement('div');
        row.className = 'bookmark-row';
        const span = document.createElement('span');
        span.className = 'mono';
        span.textContent = Aether.utils.formatTime(bm.time) + ' · ' + bm.label;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'bookmark-del-btn';
        del.textContent = '×';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          bookmarksMap[key] = getTrackBookmarks().filter((x) => x.id !== bm.id);
          Aether.utils.storage.set('bookmarksMap', bookmarksMap);
          renderBookmarks();
        });
        row.appendChild(span);
        row.appendChild(del);
        row.addEventListener('click', () => {
          if (Number.isFinite(mediaEl.duration)) mediaEl.currentTime = bm.time;
        });
        bookmarkList.appendChild(row);
      });
    }

    document.getElementById('btn-bookmark-add').addEventListener('click', addBookmark);

    // =========================================================================
    // Video Transform & Color Filters
    // =========================================================================
    function applyVideoTransform() {
      let scale = 1;
      const needsScale = (rotationDeg === 90 || rotationDeg === 270) && mediaEl.videoWidth > 0 && mediaEl.videoHeight > 0;
      if (needsScale) {
        const sw = stageMediaShell.clientWidth || playerStage.clientWidth || 16;
        const sh = stageMediaShell.clientHeight || playerStage.clientHeight || 9;
        const vw = mediaEl.videoWidth;
        const vh = mediaEl.videoHeight;
        const fitNormal = Math.min(sw / vw, sh / vh);
        const fitRot = Math.min(sw / vh, sh / vw);
        if (fitNormal > 0 && fitRot > 0) scale = fitRot / fitNormal;
      }

      if (rotationDeg === 0 && !flipH) {
        mediaEl.style.transform = 'none';
      } else {
        const flipStr = flipH ? ' scaleX(-1)' : '';
        const scaleStr = needsScale ? (' scale(' + scale.toFixed(3) + ')') : '';
        mediaEl.style.transform = 'rotate(' + rotationDeg + 'deg)' + scaleStr + flipStr;
      }
      mediaEl.style.objectFit = (pipManager.desktopPiPActive && fitModeIdx === 0) ? 'cover' : FIT_MODES[fitModeIdx].id;
      mediaEl.style.filter = 'brightness(' + brightness + '%) contrast(' + contrast + '%) saturate(' + saturation + '%)';

      document.getElementById('btn-vid-flip').classList.toggle('active', flipH);
      vidFitLabel.textContent = FIT_MODES[fitModeIdx].label;
      filterBrightnessVal.textContent = brightness + '%';
      filterContrastVal.textContent = contrast + '%';
      filterSaturationVal.textContent = saturation + '%';
    }

    document.getElementById('btn-vid-rotate').addEventListener('click', () => {
      rotationDeg = (rotationDeg + 90) % 360;
      applyVideoTransform();
      pipManager.onVideoDimensionsReady();
      showToast('화면 회전: ' + rotationDeg + '°');
    });

    document.getElementById('btn-vid-flip').addEventListener('click', () => {
      flipH = !flipH;
      applyVideoTransform();
      showToast(flipH ? '좌우 반전 켜짐' : '좌우 반전 꺼짐');
    });

    document.getElementById('btn-vid-fit').addEventListener('click', () => {
      fitModeIdx = (fitModeIdx + 1) % FIT_MODES.length;
      applyVideoTransform();
      showToast('화면 비율: ' + FIT_MODES[fitModeIdx].label);
    });

    filterBrightness.addEventListener('input', () => { brightness = Number(filterBrightness.value); applyVideoTransform(); });
    filterContrast.addEventListener('input', () => { contrast = Number(filterContrast.value); applyVideoTransform(); });
    filterSaturation.addEventListener('input', () => { saturation = Number(filterSaturation.value); applyVideoTransform(); });

    document.getElementById('btn-vid-reset').addEventListener('click', () => {
      rotationDeg = 0;
      flipH = false;
      fitModeIdx = 0;
      brightness = 100;
      contrast = 100;
      saturation = 100;
      filterBrightness.value = '100';
      filterContrast.value = '100';
      filterSaturation.value = '100';
      applyVideoTransform();
      showToast('화면 보정 초기화됨');
    });

    // =========================================================================
    // Custom Subtitles & Synced Lyrics (.LRC)
    // =========================================================================
    function updateSubtitleRender() {
      const subBtn = document.getElementById('btn-subtitle');
      const hasCues = Boolean(activeTrack && activeTrack.subCues && activeTrack.subCues.length);
      subBtn.classList.toggle('active', hasCues && subtitleEnabled);

      if (!hasCues || !subtitleEnabled || activeTrack.kind !== 'video') {
        subtitleDisplay.classList.add('hidden');
        return;
      }

      const t = mediaEl.currentTime - subtitleOffset;
      const cues = activeTrack.subCues;
      const lines = [];
      for (let i = 0; i < cues.length; i++) {
        if (cues[i].start <= t && cues[i].end >= t) {
          lines.push(cues[i].text);
        } else if (cues[i].start > t) {
          break;
        }
      }

      if (lines.length) {
        subtitleDisplay.textContent = lines.join('\n');
        subtitleDisplay.classList.remove('hidden');
      } else {
        subtitleDisplay.classList.add('hidden');
      }
    }

    function updateLyricsRender() {
      const lrc = activeTrack && activeTrack.lyrics;
      if (!lrc || !lrc.length || activeTrack.kind !== 'audio') {
        lyricsOverlay.classList.add('hidden');
        pipLyricLine.classList.add('hidden');
        visualizer.setActiveLyric('');
        return;
      }

      const t = mediaEl.currentTime;
      let idx = -1;
      for (let i = 0; i < lrc.length; i++) {
        if (lrc[i].time <= t) idx = i;
        else break;
      }

      const prevText = idx > 0 ? lrc[idx - 1].text : '';
      const currText = idx >= 0 ? lrc[idx].text : (lrc[0] ? '♪ ' + lrc[0].text : '');
      const nextText = (idx + 1 < lrc.length) ? lrc[idx + 1].text : '';

      lyricPrevEl.textContent = prevText;
      lyricCurrEl.textContent = currText;
      lyricNextEl.textContent = nextText;
      lyricsOverlay.classList.remove('hidden');

      visualizer.setActiveLyric(currText);
      if (currText) {
        pipLyricLine.textContent = currText;
        pipLyricLine.classList.remove('hidden');
      } else {
        pipLyricLine.classList.add('hidden');
      }
    }

    function adjustSubtitleOffset(delta) {
      subtitleOffset = Math.round((subtitleOffset + delta) * 10) / 10;
      subSyncVal.textContent = (subtitleOffset > 0 ? '+' : '') + subtitleOffset.toFixed(1) + 's';
      updateSubtitleRender();
      showToast('자막 싱크: ' + subSyncVal.textContent);
    }

    function applySubtitleStyleFromControls() {
      document.documentElement.style.setProperty('--sub-size', subSizeSelect.value + 'px');
      document.documentElement.style.setProperty('--sub-bottom', subPosSlider.value + 'px');
      document.documentElement.style.setProperty('--sub-bg-alpha', (Number(subBgSlider.value) / 100).toFixed(2));
    }

    document.getElementById('btn-sub-load').addEventListener('click', () => subtitleInput.click());
    document.getElementById('btn-lrc-load').addEventListener('click', () => lyricsInput.click());
    document.getElementById('btn-sub-sync-minus').addEventListener('click', () => adjustSubtitleOffset(-0.1));
    document.getElementById('btn-sub-sync-plus').addEventListener('click', () => adjustSubtitleOffset(0.1));
    document.getElementById('btn-sub-sync-reset').addEventListener('click', () => {
      subtitleOffset = 0;
      subSyncVal.textContent = '0.0s';
      updateSubtitleRender();
    });
    subSizeSelect.addEventListener('change', applySubtitleStyleFromControls);
    subPosSlider.addEventListener('input', applySubtitleStyleFromControls);
    subBgSlider.addEventListener('input', applySubtitleStyleFromControls);

    // =========================================================================
    // Sleep Timer & Windows Settings
    // =========================================================================
    function setSleepTimer(mode) {
      sleepMode = String(mode || '0');
      clearInterval(sleepIntervalId);
      sleepIntervalId = 0;

      document.querySelectorAll('#sleep-preset-group .eq-preset-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.sleepMin === sleepMode);
      });

      if (sleepMode === '0') {
        sleepTimerBadge.classList.add('hidden');
        return;
      }

      if (sleepMode === 'track') {
        sleepTimerBadge.textContent = '⏱ 트랙 후 종료';
        sleepTimerBadge.classList.remove('hidden');
        showToast('현재 트랙 종료 후 취침 동작이 실행됩니다', 'accent');
        return;
      }

      const mins = Number(sleepMode);
      sleepEndTs = Date.now() + mins * 60 * 1000;
      const refresh = () => {
        const rem = Math.max(0, Math.ceil((sleepEndTs - Date.now()) / 1000));
        sleepTimerBadge.textContent = '⏱ ' + Aether.utils.formatTime(rem);
        sleepTimerBadge.classList.remove('hidden');
        if (rem <= 0) executeSleepAction();
      };
      refresh();
      sleepIntervalId = setInterval(refresh, 1000);
      showToast('취침 타이머 설정: ' + mins + '분', 'accent');
    }

    function executeSleepAction() {
      const action = sleepActionSelect.value;
      setSleepTimer('0');
      if (action === 'close' && Aether.bridge.isDesktop) {
        Aether.bridge.close();
      } else {
        mediaEl.pause();
        showToast('취침 타이머 완료: 재생을 일시정지했습니다', 'accent');
      }
    }

    document.getElementById('sleep-preset-group').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sleep-min]');
      if (btn) setSleepTimer(btn.dataset.sleepMin);
    });

    btnFileAssoc.addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.setAssoc(!assocRegistered);
    });

    btnFileAssocSettings.addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.openAssocSettings();
    });

    // =========================================================================
    // Scrubber & Thumbnail Preview
    // =========================================================================
    function setupPreviewSource(track) {
      if (previewUrl) {
        previewVideo.removeAttribute('src');
        previewVideo.load();
        previewUrl = '';
      }
      if (track && track.kind === 'video' && track.url && !track.isLiveStream) {
        previewUrl = track.url;
        previewVideo.src = track.url;
      }
    }

    previewVideo.addEventListener('seeked', () => {
      const ctx = previewCanvas.getContext('2d');
      if (ctx && previewVideo.videoWidth > 0 && previewVideo.videoHeight > 0) {
        try {
          const cw = previewCanvas.width;
          const ch = previewCanvas.height;
          const vw = previewVideo.videoWidth;
          const vh = previewVideo.videoHeight;
          const s = Math.min(cw / vw, ch / vh);
          const dw = vw * s;
          const dh = vh * s;
          ctx.fillStyle = '#06070b';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(previewVideo, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
        } catch { }
      }
      if (pendingPreviewTime !== null) {
        const next = pendingPreviewTime;
        pendingPreviewTime = null;
        requestPreviewFrame(next);
      }
    });

    function requestPreviewFrame(timeSec) {
      if (!previewUrl || !Number.isFinite(timeSec)) return;
      const now = performance.now();
      if (now - lastPreviewSeek < 75) {
        pendingPreviewTime = timeSec;
        return;
      }
      lastPreviewSeek = now;
      try { previewVideo.currentTime = timeSec; } catch { }
    }

    function ratioFromPointer(trackEl, clientX) {
      const rect = trackEl.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function bindScrubber(trackEl, withPreview) {
      let dragging = false;
      const seekAt = (clientX) => {
        if (!activeTrack || !Number.isFinite(mediaEl.duration) || mediaEl.duration <= 0) return;
        const ratio = ratioFromPointer(trackEl, clientX);
        const t = ratio * mediaEl.duration;
        mediaEl.currentTime = t;
        updateScrubberUI(t, mediaEl.duration);
      };

      trackEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        isScrubbing = true;
        trackEl.classList.add('dragging');
        trackEl.setPointerCapture(e.pointerId);
        seekAt(e.clientX);
      });

      trackEl.addEventListener('pointermove', (e) => {
        if (dragging) seekAt(e.clientX);
        if (withPreview && activeTrack && Number.isFinite(mediaEl.duration) && mediaEl.duration > 0) {
          const rect = trackEl.getBoundingClientRect();
          const ratio = ratioFromPointer(trackEl, e.clientX);
          const time = ratio * mediaEl.duration;
          previewTime.textContent = Aether.utils.formatTime(time);
          const clampedLeft = Math.max(85, Math.min(rect.width - 85, ratio * rect.width));
          previewCard.style.left = clampedLeft + 'px';
          previewCard.classList.remove('hidden');
          if (activeTrack.kind === 'video' && previewUrl) requestPreviewFrame(time);
        }
      });

      const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        isScrubbing = false;
        trackEl.classList.remove('dragging');
        if (trackEl.hasPointerCapture(e.pointerId)) trackEl.releasePointerCapture(e.pointerId);
      };

      trackEl.addEventListener('pointerup', endDrag);
      trackEl.addEventListener('pointercancel', endDrag);
      if (withPreview) {
        trackEl.addEventListener('pointerleave', () => previewCard.classList.add('hidden'));
      }
    }

    bindScrubber(scrubberTrack, true);
    bindScrubber(pipScrubberTrack, false);

    // =========================================================================
    // Custom Titlebar, Top Margins, Desktop PIP HUD & Stage Interactions
    // =========================================================================
    let pendingWinDrag = null;
    let pendingTopStripClick = false;

    function bindWindowMoveSurface(el, shouldAllow, clickFallback) {
      if (!el) return;
      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || pipManager.desktopPiPActive || !shouldAllow(e)) return;
        pendingWinDrag = { x: e.clientX, y: e.clientY };
        pendingTopStripClick = Boolean(clickFallback);
      });
    }

    global.addEventListener('mousemove', (e) => {
      if (!pendingWinDrag) return;
      if (Math.hypot(e.clientX - pendingWinDrag.x, e.clientY - pendingWinDrag.y) >= 4) {
        pendingWinDrag = null;
        pendingTopStripClick = false;
        Aether.bridge.startDrag();
      }
    });

    global.addEventListener('mouseup', () => {
      const doClick = pendingWinDrag && pendingTopStripClick;
      pendingWinDrag = null;
      pendingTopStripClick = false;
      if (doClick && activeTrack && !pipManager.isAnyPiPActive()) {
        togglePlay();
      }
    });

    global.addEventListener('blur', () => {
      pendingWinDrag = null;
      pendingTopStripClick = false;
    });

    const allowHeaderDrag = (e) => !e.target.closest('button, input, select, a, [role="button"]');
    bindWindowMoveSurface(topHeader, allowHeaderDrag, false);
    bindWindowMoveSurface(workspaceGrid, (e) => e.target === workspaceGrid, false);
    bindWindowMoveSurface(welcomeScreen, (e) => e.target === welcomeScreen, false);
    bindWindowMoveSurface(stageTopDragStrip, () => !pipManager.desktopPiPActive, true);

    topHeader.addEventListener('dblclick', (e) => {
      if (allowHeaderDrag(e) && !e.target.closest('#brand-logo')) Aether.bridge.toggleMaximize();
    });
    stageTopDragStrip.addEventListener('dblclick', () => {
      if (!pipManager.desktopPiPActive) toggleFullscreen();
    });

    document.getElementById('btn-win-min').addEventListener('click', () => Aether.bridge.minimize());
    document.getElementById('btn-win-max').addEventListener('click', () => Aether.bridge.toggleMaximize());
    document.getElementById('btn-win-close').addEventListener('click', () => Aether.bridge.close());
    btnPinTopmost.addEventListener('click', () => pipManager.toggleTopMost());

    btnHome.addEventListener('click', closeMediaToHome);
    btnCloseMedia.addEventListener('click', closeMediaToHome);
    btnStopHome.addEventListener('click', closeMediaToHome);
    btnWelcomeFolder.addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.openFolder();
      else showToast('폴더 열기는 데스크톱 앱에서 지원됩니다', 'warn');
    });
    btnWelcomeShortcuts.addEventListener('click', () => btnShortcuts.click());

    pipHudTop.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !e.target.closest('button')) Aether.bridge.startDrag();
    });

    document.getElementById('pip-resize-grip').addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      Aether.bridge.startResize(17);
    });

    document.querySelectorAll('.pip-edge-grip').forEach((grip) => {
      grip.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        Aether.bridge.startResize(Number(grip.dataset.hit) || 17);
      });
    });

    document.getElementById('btn-pip-snap-tl').addEventListener('click', () => Aether.bridge.snapPiP('tl'));
    document.getElementById('btn-pip-snap-tr').addEventListener('click', () => Aether.bridge.snapPiP('tr'));
    document.getElementById('btn-pip-snap-bl').addEventListener('click', () => Aether.bridge.snapPiP('bl'));
    document.getElementById('btn-pip-snap-br').addEventListener('click', () => Aether.bridge.snapPiP('br'));

    const ratioOrZero = () => (pipManager.autoAspectFit ? pipManager.getCurrentAspectRatio() : 0);
    document.getElementById('btn-pip-size-s').addEventListener('click', () => Aether.bridge.presetPiPSize('s', ratioOrZero()));
    document.getElementById('btn-pip-size-m').addEventListener('click', () => Aether.bridge.presetPiPSize('m', ratioOrZero()));
    document.getElementById('btn-pip-size-l').addEventListener('click', () => Aether.bridge.presetPiPSize('l', ratioOrZero()));
    document.getElementById('btn-pip-fit-aspect').addEventListener('click', () => {
      pipManager.fitCurrentAspect();
      showToast('PIP 창을 영상 비율에 맞췄습니다');
    });
    document.getElementById('btn-pip-ghost').addEventListener('click', () => pipManager.toggleGhost());
    document.getElementById('btn-pip-hud-return').addEventListener('click', () => pipManager.exit());
    document.getElementById('btn-pip-hud-close').addEventListener('click', () => Aether.bridge.close());

    document.getElementById('btn-pip-prev').addEventListener('click', () => playlist.prev());
    document.getElementById('btn-pip-play').addEventListener('click', () => togglePlay());
    document.getElementById('btn-pip-next').addEventListener('click', () => playlist.next(false));
    document.getElementById('btn-pip-back10').addEventListener('click', () => seekRelative(-10));
    document.getElementById('btn-pip-fwd10').addEventListener('click', () => seekRelative(10));
    document.getElementById('btn-pip-mute').addEventListener('click', toggleMute);
    pipVolSlider.addEventListener('input', () => setVolume(Number(pipVolSlider.value) / 100));
    btnPipSpeed.addEventListener('click', cycleSpeed);

    function handleOpacityChange(percentVal) {
      const pct = Math.max(35, Math.min(100, Number(percentVal) || 100));
      pipManager.setOpacity(pct / 100);
      syncPiPControlsUI();
    }

    pipOpacitySlider.addEventListener('input', () => handleOpacityChange(pipOpacitySlider.value));
    popoverOpacitySlider.addEventListener('input', () => handleOpacityChange(popoverOpacitySlider.value));

    function syncPiPControlsUI() {
      const mode = pipManager.getPreferredMode();
      pipOptDesktop.classList.toggle('selected', mode === 'desktop');
      pipOptSeparate.classList.toggle('selected', mode === 'separate');

      const opPct = Math.round((pipManager.opacity || 1) * 100);
      pipOpacitySlider.value = String(opPct);
      pipOpacityLabel.textContent = opPct + '%';
      popoverOpacitySlider.value = String(opPct);
      popoverOpacityValue.textContent = opPct + '%';

      togglePipAutoAspect.checked = pipManager.autoAspectFit;
      togglePipGhost.checked = pipManager.isGhost;
      toggleGlobalHotkeys.checked = pipManager.globalHotkeys;
      toggleTopmostPin.checked = pipManager.topMost;
      btnPinTopmost.setAttribute('aria-pressed', String(pipManager.topMost));
    }

    // Stage Click / Dblclick / PIP Drag
    let stageDragStart = null;
    let suppressNextStageClick = false;
    stageClickZone.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !pipManager.desktopPiPActive) return;
      stageDragStart = { x: e.clientX, y: e.clientY };
    });

    stageClickZone.addEventListener('mousemove', (e) => {
      if (!stageDragStart || !pipManager.desktopPiPActive) return;
      if (Math.abs(e.clientX - stageDragStart.x) > 5 || Math.abs(e.clientY - stageDragStart.y) > 5) {
        stageDragStart = null;
        suppressNextStageClick = true;
        clearTimeout(clickTimer);
        setTimeout(() => { suppressNextStageClick = false; }, 350);
        Aether.bridge.startDrag();
      }
    });

    global.addEventListener('mouseup', () => { stageDragStart = null; });

    stageClickZone.addEventListener('click', () => {
      if (!activeTrack) return;
      if (suppressNextStageClick) {
        suppressNextStageClick = false;
        return;
      }
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => togglePlay(), 200);
    });

    stageClickZone.addEventListener('dblclick', (e) => {
      clearTimeout(clickTimer);
      if (pipManager.desktopPiPActive) {
        pipManager.exit();
        return;
      }
      const rect = stageClickZone.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
      if (relX < 0.25) seekRelative(-10);
      else if (relX > 0.75) seekRelative(10);
      else toggleFullscreen();
    });

    stageClickZone.addEventListener('wheel', (e) => {
      if (!activeTrack) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setVolume(mediaEl.volume + delta);
      showGesture(ICONS.vol, Math.round(mediaEl.volume * 100) + '%');
    }, { passive: false });

    function resetIdleTimer() {
      playerStage.classList.remove('controls-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (activeTrack && activeTrack.kind === 'video' && !mediaEl.paused && !pipPopover.classList.contains('hidden')) {
          return;
        }
        if (activeTrack && activeTrack.kind === 'video' && !mediaEl.paused) {
          playerStage.classList.add('controls-idle');
        }
      }, 2500);
    }

    playerStage.addEventListener('mousemove', resetIdleTimer);
    playerStage.addEventListener('mousedown', resetIdleTimer);

    // =========================================================================
    // Dock, Popovers, Tools & Playlist Controls
    // =========================================================================
    function triggerOpenFiles() {
      if (Aether.bridge.isDesktop) Aether.bridge.openFiles();
      else fileInput.click();
    }

    document.getElementById('btn-open-files').addEventListener('click', triggerOpenFiles);
    document.getElementById('btn-welcome-open').addEventListener('click', triggerOpenFiles);
    document.getElementById('btn-playlist-add').addEventListener('click', triggerOpenFiles);

    document.getElementById('btn-playlist-folder').addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.openFolder();
      else showToast('폴더 통째로 열기는 데스크톱 앱에서 지원됩니다', 'warn');
    });

    document.getElementById('btn-playlist-import').addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.openPlaylist();
      else showToast('M3U 불러오기는 데스크톱 앱에서 지원됩니다', 'warn');
    });

    document.getElementById('btn-playlist-export').addEventListener('click', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.savePlaylist(playlist.exportM3uEntries());
      else showToast('M3U 저장은 데스크톱 앱에서 지원됩니다', 'warn');
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        playlist.addDomFiles(fileInput.files);
        fileInput.value = '';
      }
    });

    subtitleInput.addEventListener('change', async () => {
      if (subtitleInput.files && subtitleInput.files.length) {
        const file = subtitleInput.files[0];
        const text = await file.text();
        playlist.attachSubtitleText(text, Aether.utils.getCompoundExtension(file.name), file.name);
        subtitleInput.value = '';
      }
    });

    lyricsInput.addEventListener('change', async () => {
      if (lyricsInput.files && lyricsInput.files.length) {
        const file = lyricsInput.files[0];
        const text = await file.text();
        playlist.attachLyricsText(text, file.name);
        lyricsInput.value = '';
      }
    });

    document.getElementById('btn-demo-video').addEventListener('click', () => {
      playlist.addAndPlayDemo(Aether.demo.createDemoVideoTrack(audioEngine));
    });

    document.getElementById('btn-demo-audio').addEventListener('click', () => {
      playlist.addAndPlayDemo(Aether.demo.createDemoAudioTrack());
    });

    document.getElementById('btn-prev').addEventListener('click', () => playlist.prev());
    document.getElementById('btn-play-pause').addEventListener('click', () => togglePlay());
    document.getElementById('btn-next').addEventListener('click', () => playlist.next(false));
    document.getElementById('btn-seek-back').addEventListener('click', () => seekRelative(-10));
    document.getElementById('btn-seek-fwd').addEventListener('click', () => seekRelative(10));
    document.getElementById('btn-mute').addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', () => setVolume(Number(volumeSlider.value) / 100));

    document.getElementById('btn-speed').addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = speedPopover.classList.contains('hidden');
      closeFloatingMenus();
      speedPopover.classList.toggle('hidden', !willOpen);
      e.currentTarget.setAttribute('aria-expanded', String(willOpen));
    });

    speedPopover.addEventListener('click', (e) => {
      const btn = e.target.closest('.speed-opt');
      if (!btn) return;
      setPlaybackSpeed(Number(btn.dataset.speed));
      speedPopover.classList.add('hidden');
    });

    document.getElementById('btn-viz-mode').addEventListener('click', () => {
      const mode = visualizer.cycleMode();
      vizModeLabel.textContent = mode.label;
      Aether.utils.storage.set('vizMode', mode.id);
      showToast('비주얼라이저: ' + mode.label);
    });

    document.getElementById('btn-subtitle').addEventListener('click', () => {
      if (!activeTrack || activeTrack.kind !== 'video') return;
      if (activeTrack.subCues && activeTrack.subCues.length) {
        subtitleEnabled = !subtitleEnabled;
        updateSubtitleRender();
        showToast(subtitleEnabled ? '자막 켜짐' : '자막 꺼짐');
      } else {
        subtitleInput.click();
      }
    });

    btnAmbilight.addEventListener('click', () => {
      const next = appRoot.dataset.ambilight !== 'true';
      appRoot.dataset.ambilight = next ? 'true' : 'false';
      visualizer.setAmbilightEnabled(next);
      btnAmbilight.classList.toggle('active', next);
      btnAmbilight.setAttribute('aria-pressed', String(next));
      Aether.utils.storage.set('ambilight', next);
      showToast(next ? '앰비라이트 켜짐' : '앰비라이트 꺼짐');
    });

    function captureScreenshot() {
      if (!activeTrack) return;
      const c = document.createElement('canvas');
      if (activeTrack.kind === 'video' && mediaEl.videoWidth > 0) {
        c.width = mediaEl.videoWidth;
        c.height = mediaEl.videoHeight;
        const ctx = c.getContext('2d');
        ctx.filter = 'brightness(' + brightness + '%) contrast(' + contrast + '%) saturate(' + saturation + '%)';
        ctx.drawImage(mediaEl, 0, 0, c.width, c.height);
      } else {
        const viz = document.getElementById('audio-visualizer-canvas');
        c.width = viz.width || 1280;
        c.height = viz.height || 720;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#06070b';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(viz, 0, 0, c.width, c.height);
      }
      try {
        const dataUrl = c.toDataURL('image/png');
        const safeName = (activeTrack.title || 'aether').replace(/[\\/:*?"<>|]/g, '_') + '.png';
        if (Aether.bridge.isDesktop) Aether.bridge.saveScreenshot(safeName, dataUrl);
        else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = safeName;
          a.click();
          showToast('프레임 캡처 저장됨', 'accent');
        }
      } catch {
        showToast('이 미디어는 보안 정책으로 캡처할 수 없습니다', 'warn');
      }
    }

    document.getElementById('btn-screenshot').addEventListener('click', captureScreenshot);

    // PIP Controls & Popover
    document.getElementById('btn-pip-main').addEventListener('click', () => pipManager.toggle());

    pipMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = pipPopover.classList.contains('hidden');
      closeFloatingMenus();
      pipPopover.classList.toggle('hidden', !willOpen);
      pipMenuToggle.setAttribute('aria-expanded', String(willOpen));
      playerStage.classList.toggle('dock-pinned', willOpen);
      syncPiPControlsUI();
    });

    pipOptDesktop.addEventListener('click', () => {
      pipManager.setPreferredMode('desktop');
      syncPiPControlsUI();
      closeFloatingMenus();
      if (activeTrack) pipManager.toggle('desktop');
    });

    pipOptSeparate.addEventListener('click', () => {
      pipManager.setPreferredMode('separate');
      syncPiPControlsUI();
      closeFloatingMenus();
      if (activeTrack) pipManager.toggle('separate');
    });

    togglePipAutoAspect.addEventListener('change', () => {
      pipManager.setAutoAspectFit(togglePipAutoAspect.checked);
      showToast(togglePipAutoAspect.checked ? 'PIP 영상 비율 자동 맞춤 켜짐' : 'PIP 영상 비율 자동 맞춤 꺼짐');
    });

    togglePipGhost.addEventListener('change', () => {
      pipManager.toggleGhost(togglePipGhost.checked);
      closeFloatingMenus();
    });

    toggleGlobalHotkeys.addEventListener('change', () => {
      pipManager.setGlobalHotkeys(toggleGlobalHotkeys.checked);
      showToast(toggleGlobalHotkeys.checked ? 'Windows 전역 단축키 활성화 (Alt+Shift+P)' : 'Windows 전역 단축키 비활성화');
    });

    toggleTopmostPin.addEventListener('change', () => {
      if (Aether.bridge.isDesktop) Aether.bridge.setTopMost(toggleTopmostPin.checked);
    });

    // Tools Popover & Tabs
    btnTools.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = toolsPopover.classList.contains('hidden');
      closeFloatingMenus();
      toolsPopover.classList.toggle('hidden', !willOpen);
      btnTools.setAttribute('aria-expanded', String(willOpen));
    });

    document.querySelectorAll('.tools-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const target = tabBtn.dataset.toolsTab;
        document.querySelectorAll('.tools-tab-btn').forEach((b) => b.classList.toggle('active', b === tabBtn));
        document.querySelectorAll('.tools-tab-panel').forEach((p) => {
          p.classList.toggle('hidden', p.dataset.toolsPanel !== target);
        });
      });
    });

    document.getElementById('btn-pip-placeholder-prev').addEventListener('click', () => playlist.prev());
    document.getElementById('btn-pip-placeholder-play').addEventListener('click', () => togglePlay());
    document.getElementById('btn-pip-placeholder-next').addEventListener('click', () => playlist.next(false));
    document.getElementById('btn-pip-return').addEventListener('click', () => pipManager.exit());

    function toggleFullscreen() {
      if (Aether.bridge.isDesktop) {
        Aether.bridge.toggleFullscreen();
        return;
      }
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else playerStage.requestFullscreen().catch(function () {});
    }

    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // EQ Popover
    btnEq.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = eqPopover.classList.contains('hidden');
      closeFloatingMenus();
      eqPopover.classList.toggle('hidden', !willOpen);
      btnEq.setAttribute('aria-expanded', String(willOpen));
    });

    function syncEqSlidersUI(values) {
      document.querySelectorAll('.eq-range').forEach((slider) => {
        const idx = Number(slider.dataset.eqBand);
        const val = values[idx] || 0;
        slider.value = String(val);
        const label = document.getElementById('eq-val-' + idx);
        if (label) label.textContent = (val > 0 ? '+' : '') + val + 'dB';
      });
    }

    document.querySelectorAll('.eq-range').forEach((slider) => {
      slider.addEventListener('input', () => {
        audioEngine.ensureInitialized(mediaEl);
        const idx = Number(slider.dataset.eqBand);
        const val = Number(slider.value);
        audioEngine.setBand(idx, val);
        const label = document.getElementById('eq-val-' + idx);
        if (label) label.textContent = (val > 0 ? '+' : '') + val + 'dB';
        document.querySelectorAll('.eq-preset-btn[data-eq-preset]').forEach((b) => b.classList.remove('active'));
      });
    });

    document.getElementById('eq-preset-group').addEventListener('click', (e) => {
      const btn = e.target.closest('.eq-preset-btn');
      if (!btn) return;
      audioEngine.ensureInitialized(mediaEl);
      const vals = audioEngine.setPreset(btn.dataset.eqPreset);
      syncEqSlidersUI(vals);
      document.querySelectorAll('#eq-preset-group .eq-preset-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });

    document.getElementById('btn-eq-reset').addEventListener('click', () => {
      audioEngine.ensureInitialized(mediaEl);
      const vals = audioEngine.setPreset('flat');
      syncEqSlidersUI(vals);
      boostSlider.value = '100';
      boostValue.textContent = '100%';
      audioEngine.setBoost(100);
      document.querySelectorAll('#eq-preset-group .eq-preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.eqPreset === 'flat'));
    });

    boostSlider.addEventListener('input', () => {
      audioEngine.ensureInitialized(mediaEl);
      const pct = Number(boostSlider.value);
      boostValue.textContent = pct + '%';
      audioEngine.setBoost(pct);
    });

    // Playlist Drawer & Drag Reorder
    function togglePlaylistDrawer(force) {
      const next = typeof force === 'boolean' ? force : appRoot.dataset.playlistOpen !== 'true';
      appRoot.dataset.playlistOpen = next ? 'true' : 'false';
      btnPlaylistToggle.setAttribute('aria-expanded', String(next));
    }

    btnPlaylistToggle.addEventListener('click', () => togglePlaylistDrawer());
    playlistSearch.addEventListener('input', () => playlist.setSearchQuery(playlistSearch.value));

    btnShuffle.addEventListener('click', () => {
      const active = playlist.toggleShuffle();
      btnShuffle.setAttribute('aria-pressed', String(active));
      showToast(active ? '셔플 재생 켜짐' : '셔플 재생 꺼짐');
    });

    btnRepeat.addEventListener('click', () => {
      const mode = playlist.cycleRepeat();
      btnRepeat.dataset.repeat = mode;
      const map = { off: '반복 끄기', all: '전체 반복', one: '한 곡 반복' };
      btnRepeat.title = '반복 모드: ' + map[mode];
      showToast(map[mode]);
    });

    document.getElementById('btn-clear-playlist').addEventListener('click', () => {
      playlist.clear();
      showToast('재생목록을 비웠습니다');
    });

    let draggedPlaylistIdx = -1;
    function renderPlaylist() {
      playlistCountBadge.textContent = String(playlist.items.length);
      const filtered = playlist.getFilteredItems();
      playlistEmpty.classList.toggle('hidden', playlist.items.length > 0);
      playlistItemsEl.innerHTML = '';

      filtered.forEach(({ item, idx }) => {
        const li = document.createElement('li');
        li.className = 'playlist-item' + (idx === playlist.activeIndex ? ' active' : '');
        li.dataset.trackId = item.id;
        li.draggable = !playlist.searchQuery;

        li.addEventListener('dragstart', (e) => {
          draggedPlaylistIdx = idx;
          e.dataTransfer.effectAllowed = 'move';
        });

        li.addEventListener('dragover', (e) => {
          if (draggedPlaylistIdx < 0 || draggedPlaylistIdx === idx) return;
          e.preventDefault();
          const rect = li.getBoundingClientRect();
          const topHalf = e.clientY < rect.top + rect.height * 0.5;
          li.classList.toggle('drag-over-top', topHalf);
          li.classList.toggle('drag-over-bottom', !topHalf);
        });

        li.addEventListener('dragleave', () => {
          li.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        li.addEventListener('drop', (e) => {
          li.classList.remove('drag-over-top', 'drag-over-bottom');
          if (draggedPlaylistIdx < 0 || draggedPlaylistIdx === idx) return;
          e.preventDefault();
          e.stopPropagation();
          playlist.moveItem(draggedPlaylistIdx, idx);
          draggedPlaylistIdx = -1;
        });

        li.addEventListener('dragend', () => {
          draggedPlaylistIdx = -1;
          document.querySelectorAll('.playlist-item').forEach((el) => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        });

        const thumb = document.createElement('div');
        thumb.className = 'playlist-thumb';
        if (item.artworkUrl) {
          const img = document.createElement('img');
          img.src = item.artworkUrl;
          img.alt = '';
          thumb.appendChild(img);
        } else {
          thumb.textContent = String(item.ext || item.kind).toUpperCase();
        }

        const info = document.createElement('div');
        info.className = 'playlist-item-info';

        const titleEl = document.createElement('div');
        titleEl.className = 'playlist-item-title';
        titleEl.textContent = item.title || item.name;

        const subEl = document.createElement('div');
        subEl.className = 'playlist-item-sub mono';
        const parts = [String(item.ext || '').toUpperCase()];
        if (item.isLiveStream) parts.push('LIVE');
        else if (Number.isFinite(item.duration) && item.duration > 0) parts.push(Aether.utils.formatTime(item.duration));
        if (item.subCues && item.subCues.length) parts.push('자막');
        if (item.lyrics && item.lyrics.length) parts.push('가사');
        if (item.kind === 'audio' && item.artist && item.artist !== '아티스트 정보 없음') {
          parts.push(item.artist);
        }
        subEl.textContent = parts.join(' · ');

        info.appendChild(titleEl);
        info.appendChild(subEl);

        const actions = document.createElement('div');
        actions.className = 'playlist-item-actions';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'playlist-item-remove';
        removeBtn.type = 'button';
        removeBtn.title = '목록에서 제거';
        removeBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          playlist.removeById(item.id);
        });
        actions.appendChild(removeBtn);

        li.appendChild(thumb);
        li.appendChild(info);
        li.appendChild(actions);
        li.addEventListener('click', () => playlist.selectIndex(idx));
        playlistItemsEl.appendChild(li);
      });
    }

    // Shortcuts Modal & Menu Closing
    btnShortcuts.addEventListener('click', () => {
      const open = shortcutsModal.classList.contains('hidden');
      closeFloatingMenus();
      shortcutsModal.classList.toggle('hidden', !open);
      btnShortcuts.setAttribute('aria-expanded', String(open));
    });

    document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
      shortcutsModal.classList.add('hidden');
      btnShortcuts.setAttribute('aria-expanded', 'false');
    });

    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.classList.add('hidden');
        btnShortcuts.setAttribute('aria-expanded', 'false');
      }
    });

    function closeFloatingMenus() {
      pipPopover.classList.add('hidden');
      pipMenuToggle.setAttribute('aria-expanded', 'false');
      eqPopover.classList.add('hidden');
      btnEq.setAttribute('aria-expanded', 'false');
      toolsPopover.classList.add('hidden');
      btnTools.setAttribute('aria-expanded', 'false');
      speedPopover.classList.add('hidden');
      document.getElementById('btn-speed').setAttribute('aria-expanded', 'false');
      playerStage.classList.remove('dock-pinned');
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pip-popover, #btn-pip-menu-toggle, #eq-popover, #btn-eq, #tools-popover, #btn-tools, .speed-control-wrap')) {
        closeFloatingMenus();
      }
    });

    // Global Drag & Drop
    global.addEventListener('dragenter', (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
        dragDepth += 1;
        dropVeil.classList.remove('hidden');
      }
    });

    global.addEventListener('dragover', (e) => { e.preventDefault(); });

    global.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dropVeil.classList.add('hidden');
    });

    global.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      dropVeil.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        playlist.addDomFiles(e.dataTransfer.files);
      }
    });

    global.addEventListener('beforeunload', () => saveCurrentResumeState(true));
    global.addEventListener('resize', () => {
      if (rotationDeg === 90 || rotationDeg === 270) applyVideoTransform();
    });

    // =========================================================================
    // Secret Easter Egg: AETHER Overdrive Warp (Logo 5x Click or Type "aether")
    // =========================================================================
    let eggClickCount = 0;
    let eggClickTimer = 0;
    let eggKeyBuf = '';
    let eggRaf = 0;
    let eggWarpBoost = 1;
    let overdriveEnabled = Boolean(Aether.utils.storage.get('overdrive', false));

    function syncOverdriveTheme() {
      appRoot.dataset.overdrive = overdriveEnabled ? 'true' : 'false';
      btnEasterTheme.textContent = overdriveEnabled ? '기본 오션 블루 테마로 복귀' : '네온 오버드라이브 테마 켜기';
    }
    syncOverdriveTheme();

    function playEasterEggChime() {
      try {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const t0 = ctx.currentTime + idx * 0.07;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.6);
        });
        setTimeout(() => ctx.close().catch(function () {}), 1200);
      } catch { }
    }

    function startEasterEggWarp() {
      if (!easterEggCanvas) return;
      cancelAnimationFrame(eggRaf);
      const ctx = easterEggCanvas.getContext('2d');
      const stars = [];
      for (let i = 0; i < 160; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 1600,
          y: (Math.random() - 0.5) * 1000,
          z: Math.random() * 900 + 80,
          hue: i % 3 === 0 ? '#f472b6' : (i % 2 === 0 ? '#38bdf8' : '#a78bfa')
        });
      }

      const tick = () => {
        if (easterEggModal.classList.contains('hidden')) return;
        const w = (easterEggCanvas.width = easterEggModal.clientWidth || 800);
        const h = (easterEggCanvas.height = easterEggModal.clientHeight || 500);
        const cx = w * 0.5;
        const cy = h * 0.5;
        ctx.fillStyle = 'rgba(4, 6, 12, 0.34)';
        ctx.fillRect(0, 0, w, h);

        eggWarpBoost = Math.max(1, eggWarpBoost * 0.96);
        const speed = 9 * eggWarpBoost;
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const prevZ = s.z;
          s.z -= speed;
          if (s.z <= 12) {
            s.x = (Math.random() - 0.5) * 1600;
            s.y = (Math.random() - 0.5) * 1000;
            s.z = 950;
            continue;
          }
          const k1 = 260 / prevZ;
          const k2 = 260 / s.z;
          ctx.strokeStyle = s.hue;
          ctx.lineWidth = Math.max(1, (1 - s.z / 950) * 3.2);
          ctx.beginPath();
          ctx.moveTo(cx + s.x * k1, cy + s.y * k1);
          ctx.lineTo(cx + s.x * k2, cy + s.y * k2);
          ctx.stroke();
        }
        eggRaf = requestAnimationFrame(tick);
      };
      tick();
    }

    function openEasterEgg() {
      closeFloatingMenus();
      easterEggModal.classList.remove('hidden');
      eggWarpBoost = 4.2;
      playEasterEggChime();
      startEasterEggWarp();
      showToast('✦ 이스터에그 발견: AETHER HYPER-STUDIO ✦', 'accent');
    }

    function closeEasterEgg() {
      easterEggModal.classList.add('hidden');
      cancelAnimationFrame(eggRaf);
    }

    function registerLogoTap() {
      eggClickCount += 1;
      clearTimeout(eggClickTimer);
      eggClickTimer = setTimeout(() => { eggClickCount = 0; }, 2400);
      if (eggClickCount >= 5) {
        eggClickCount = 0;
        openEasterEgg();
      }
    }

    if (brandLogo) brandLogo.addEventListener('click', registerLogoTap);
    if (welcomeBrandLogo) welcomeBrandLogo.addEventListener('click', registerLogoTap);
    easterEggCanvas.addEventListener('click', () => {
      eggWarpBoost = 5.5;
      playEasterEggChime();
    });
    btnEasterTheme.addEventListener('click', () => {
      overdriveEnabled = !overdriveEnabled;
      Aether.utils.storage.set('overdrive', overdriveEnabled);
      syncOverdriveTheme();
      eggWarpBoost = 3.5;
      showToast(overdriveEnabled ? '네온 오버드라이브 테마 활성화!' : '오션 블루 테마 복원됨', 'accent');
    });
    btnEasterClose.addEventListener('click', closeEasterEgg);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
      if (e.key === 'Escape') {
        if (!easterEggModal.classList.contains('hidden')) {
          closeEasterEgg();
          return;
        }
        if (!shortcutsModal.classList.contains('hidden')) {
          shortcutsModal.classList.add('hidden');
          btnShortcuts.setAttribute('aria-expanded', 'false');
          return;
        }
        if (!pipPopover.classList.contains('hidden') || !eqPopover.classList.contains('hidden') || !toolsPopover.classList.contains('hidden')) {
          closeFloatingMenus();
          return;
        }
        if (appRoot.dataset.fullscreen === 'true') { toggleFullscreen(); return; }
        if (pipManager.desktopPiPActive) { pipManager.exit(); return; }
      }

      if (isInput) return;

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key && e.key.length === 1) {
        eggKeyBuf = (eggKeyBuf + e.key.toLowerCase()).slice(-6);
        if (eggKeyBuf === 'aether') {
          eggKeyBuf = '';
          openEasterEgg();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeMediaToHome();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        triggerOpenFiles();
        return;
      }

      const key = e.key.toLowerCase();
      if (e.code === 'Space' || key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (key === 'p' && e.shiftKey) {
        e.preventDefault();
        pipMenuToggle.click();
      } else if (key === 'p') {
        e.preventDefault();
        pipManager.toggle();
      } else if (key === 't') {
        e.preventDefault();
        pipManager.toggleTopMost();
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'a' && e.shiftKey) {
        e.preventDefault();
        cycleAbLoop();
      } else if (key === 'a') {
        btnAmbilight.click();
      } else if (key === 'b') {
        addBookmark();
      } else if (key === 'r') {
        document.getElementById('btn-vid-rotate').click();
      } else if (key === 'g') {
        adjustSubtitleOffset(-0.1);
      } else if (key === 'h') {
        adjustSubtitleOffset(0.1);
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        playlist.prev();
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        playlist.next(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (key === 'j') {
        seekRelative(-10);
      } else if (key === 'l') {
        seekRelative(10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(mediaEl.volume + 0.05);
        showGesture(ICONS.vol, Math.round(mediaEl.volume * 100) + '%');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(mediaEl.volume - 0.05);
        showGesture(ICONS.vol, Math.round(mediaEl.volume * 100) + '%');
      } else if (key === 'm') {
        toggleMute();
      } else if (key === 'q') {
        togglePlaylistDrawer();
      } else if (key === 'v') {
        document.getElementById('btn-viz-mode').click();
      } else if (key === 's') {
        captureScreenshot();
      } else if (key === 'c') {
        document.getElementById('btn-subtitle').click();
      } else if (e.key === '[') {
        setPlaybackSpeed((mediaEl.playbackRate || 1) - 0.25);
      } else if (e.key === ']') {
        setPlaybackSpeed((mediaEl.playbackRate || 1) + 0.25);
      } else if (e.key === ',' && mediaEl.paused && activeTrack && activeTrack.kind === 'video') {
        mediaEl.currentTime = Math.max(0, mediaEl.currentTime - 1 / 30);
      } else if (e.key === '.' && mediaEl.paused && activeTrack && activeTrack.kind === 'video') {
        mediaEl.currentTime = mediaEl.currentTime + 1 / 30;
      } else if (e.key === '?') {
        btnShortcuts.click();
      }
    });
  });
})(window);
