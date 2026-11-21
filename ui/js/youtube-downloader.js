(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});

  function createYoutubeDownloader(deps) {
    const bridge = deps.bridge;
    const utils = deps.utils;
    const showToast = deps.showToast || function () {};
    const onBeforeOpenModal = deps.onBeforeOpenModal || function () {};

    const btnYoutubeHeader = document.getElementById('btn-youtube');
    const ytHeaderBadge = document.getElementById('yt-header-badge');
    const welcomeYtInput = document.getElementById('welcome-yt-input');
    const btnWelcomeYtGo = document.getElementById('btn-welcome-yt-go');

    const ytModal = document.getElementById('yt-modal');
    const ytEngineBadge = document.getElementById('yt-engine-badge');
    const btnYtEngineUpdate = document.getElementById('btn-yt-engine-update');
    const btnYtClose = document.getElementById('btn-yt-close');
    const ytUrlInput = document.getElementById('yt-url-input');
    const btnYtPaste = document.getElementById('btn-yt-paste');
    const btnYtFetch = document.getElementById('btn-yt-fetch');

    const ytFetchStatus = document.getElementById('yt-fetch-status');
    const ytFetchStatusText = document.getElementById('yt-fetch-status-text');
    const ytEngineProgressWrap = document.getElementById('yt-engine-progress-wrap');
    const ytEngineProgressFill = document.getElementById('yt-engine-progress-fill');

    const ytPreviewSection = document.getElementById('yt-preview-section');
    const ytThumbImg = document.getElementById('yt-thumb-img');
    const ytDurationBadge = document.getElementById('yt-duration-badge');
    const ytVideoTitle = document.getElementById('yt-video-title');
    const ytVideoChannel = document.getElementById('yt-video-channel');

    const btnYtFmtMp4 = document.getElementById('btn-yt-fmt-mp4');
    const btnYtFmtMp3 = document.getElementById('btn-yt-fmt-mp3');
    const ytMp4ResGrid = document.getElementById('yt-mp4-res-grid');
    const ytMp3QualGrid = document.getElementById('yt-mp3-qual-grid');

    const ytSaveDirText = document.getElementById('yt-save-dir-text');
    const btnYtChangeDir = document.getElementById('btn-yt-change-dir');
    const btnYtOpenDir = document.getElementById('btn-yt-open-dir');
    const toggleYtAutoplay = document.getElementById('toggle-yt-autoplay');
    const btnYtStart = document.getElementById('btn-yt-start');

    const ytDlProgressBox = document.getElementById('yt-dl-progress-box');
    const ytDlStatusText = document.getElementById('yt-dl-status-text');
    const ytDlStatsText = document.getElementById('yt-dl-stats-text');
    const ytDlProgressFill = document.getElementById('yt-dl-progress-fill');
    const btnYtCancel = document.getElementById('btn-yt-cancel');

    const ytHistorySection = document.getElementById('yt-history-section');
    const ytHistoryList = document.getElementById('yt-history-list');

    const YT_REGEX = /(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)/i;

    let currentInfo = null;
    let selectedFormat = utils.storage.get('ytFormat', 'mp4');
    let selectedResolution = null;
    let selectedBitrate = Number(utils.storage.get('ytAudioBitrate', 320)) || 320;
    let isFetching = false;
    let isDownloading = false;
    let saveDir = '';
    let autoPlay = true;
    let ytHistory = utils.storage.get('ytHistory', []);
    if (!Array.isArray(ytHistory)) ytHistory = [];

    function looksLikeYoutubeUrl(raw) {
      return YT_REGEX.test(String(raw || '').trim());
    }

    function setFetchBanner(message, isError, pct) {
      if (!message) {
        ytFetchStatus.classList.add('hidden');
        ytFetchStatus.classList.remove('is-error');
        ytEngineProgressWrap.classList.add('hidden');
        return;
      }
      ytFetchStatusText.textContent = message;
      ytFetchStatus.classList.toggle('is-error', Boolean(isError));
      ytFetchStatus.classList.remove('hidden');
      if (typeof pct === 'number' && Number.isFinite(pct) && !isError) {
        ytEngineProgressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        ytEngineProgressWrap.classList.remove('hidden');
      } else {
        ytEngineProgressWrap.classList.add('hidden');
      }
    }

    function updateStartButtonLabel() {
      if (!currentInfo) {
        btnYtStart.disabled = true;
        btnYtStart.textContent = '유튜브 링크를 먼저 조회하세요';
        return;
      }
      btnYtStart.disabled = isDownloading;
      if (isDownloading) {
        btnYtStart.textContent = '다운로드 진행 중...';
        return;
      }
      if (selectedFormat === 'mp3') {
        btnYtStart.textContent = 'MP3 (' + selectedBitrate + ' kbps) 다운로드';
      } else if (selectedResolution) {
        btnYtStart.textContent = 'MP4 (' + selectedResolution.shortSide + 'p) 다운로드';
      } else {
        btnYtStart.textContent = 'MP4 최고 화질 다운로드';
      }
    }

    function syncFormatTabs() {
      const isMp3 = selectedFormat === 'mp3';
      btnYtFmtMp4.classList.toggle('active', !isMp3);
      btnYtFmtMp3.classList.toggle('active', isMp3);
      ytMp4ResGrid.classList.toggle('hidden', isMp3);
      ytMp3QualGrid.classList.toggle('hidden', !isMp3);
      updateStartButtonLabel();
    }

    function syncMp3Chips() {
      ytMp3QualGrid.querySelectorAll('.yt-qual-chip').forEach((chip) => {
        const val = Number(chip.dataset.bitrate);
        chip.classList.toggle('active', val === selectedBitrate);
      });
    }

    function renderResolutionGrid(resolutions) {
      ytMp4ResGrid.innerHTML = '';
      selectedResolution = null;

      if (!Array.isArray(resolutions) || resolutions.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'yt-empty-res';
        emptyMsg.textContent = '기본 최고 화질(MP4)로 자동 다운로드됩니다.';
        ytMp4ResGrid.appendChild(emptyMsg);
        updateStartButtonLabel();
        return;
      }

      // Default to highest <= 1080p for balanced speed & crispness, else first option
      let defaultIdx = resolutions.findIndex((r) => r.shortSide <= 1080);
      if (defaultIdx < 0) defaultIdx = 0;

      resolutions.forEach((opt, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'yt-qual-chip' + (idx === defaultIdx ? ' active' : '');

        const topRow = document.createElement('span');
        topRow.className = 'yt-qual-main';
        const resNum = document.createElement('strong');
        resNum.textContent = opt.shortSide + 'p';
        topRow.appendChild(resNum);
        if (opt.badge) {
          const badge = document.createElement('span');
          badge.className = 'yt-res-badge mono';
          badge.textContent = opt.badge;
          topRow.appendChild(badge);
        }
        if (opt.fps >= 50) {
          const fpsBadge = document.createElement('span');
          fpsBadge.className = 'yt-res-fps mono';
          fpsBadge.textContent = Math.round(opt.fps) + 'fps';
          topRow.appendChild(fpsBadge);
        }
        if (opt.isPortrait) {
          const portBadge = document.createElement('span');
          portBadge.className = 'yt-res-port';
          portBadge.textContent = '세로';
          topRow.appendChild(portBadge);
        }

        const subRow = document.createElement('small');
        subRow.className = 'yt-qual-sub mono';
        subRow.textContent = opt.estimatedBytes > 0 ? ('~' + utils.formatBytes(opt.estimatedBytes)) : 'MP4';

        chip.appendChild(topRow);
        chip.appendChild(subRow);

        chip.addEventListener('click', () => {
          selectedResolution = opt;
          ytMp4ResGrid.querySelectorAll('.yt-qual-chip').forEach((c) => c.classList.toggle('active', c === chip));
          updateStartButtonLabel();
        });

        ytMp4ResGrid.appendChild(chip);
        if (idx === defaultIdx) selectedResolution = opt;
      });

      updateStartButtonLabel();
    }

    function renderHistory() {
      ytHistoryList.innerHTML = '';
      if (!ytHistory.length) {
        ytHistorySection.classList.add('hidden');
        return;
      }
      ytHistorySection.classList.remove('hidden');

      ytHistory.slice(0, 6).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'yt-history-item';

        const meta = document.createElement('div');
        meta.className = 'yt-history-meta';

        const badge = document.createElement('span');
        badge.className = 'format-badge';
        badge.dataset.ext = item.format || 'mp4';
        badge.textContent = String(item.format || 'mp4').toUpperCase();

        const copy = document.createElement('div');
        copy.className = 'yt-history-copy';
        const titleEl = document.createElement('strong');
        titleEl.textContent = item.title || item.fileName || '다운로드 항목';
        const subEl = document.createElement('small');
        subEl.className = 'mono';
        const parts = [];
        if (item.qualityLabel) parts.push(item.qualityLabel);
        if (item.fileSize > 0) parts.push(utils.formatBytes(item.fileSize));
        subEl.textContent = parts.join(' · ') || item.fileName || '';
        copy.appendChild(titleEl);
        copy.appendChild(subEl);

        meta.appendChild(badge);
        meta.appendChild(copy);

        const actions = document.createElement('div');
        actions.className = 'yt-history-actions';

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'tool-pill-btn tool-pill-accent';
        playBtn.textContent = '재생';
        playBtn.addEventListener('click', () => {
          if (bridge.isDesktop && item.filePath) {
            bridge.openPaths([item.filePath]);
            close();
          }
        });

        const dirBtn = document.createElement('button');
        dirBtn.type = 'button';
        dirBtn.className = 'tool-pill-btn';
        dirBtn.textContent = '폴더';
        dirBtn.addEventListener('click', () => {
          if (bridge.isDesktop) bridge.ytRevealFile(item.filePath);
        });

        actions.appendChild(playBtn);
        actions.appendChild(dirBtn);

        row.appendChild(meta);
        row.appendChild(actions);
        ytHistoryList.appendChild(row);
      });
    }

    function open(prefillUrl) {
      if (!bridge.isDesktop) {
        showToast('유튜브 다운로드는 AETHER 데스크톱 앱에서 사용할 수 있습니다', 'warn');
        return;
      }
      onBeforeOpenModal();
      ytModal.classList.remove('hidden');
      if (btnYoutubeHeader) btnYoutubeHeader.setAttribute('aria-expanded', 'true');
      bridge.ytGetState();
      renderHistory();
      syncFormatTabs();
      syncMp3Chips();

      const cleanPrefill = String(prefillUrl || '').trim();
      if (cleanPrefill) {
        ytUrlInput.value = cleanPrefill;
        fetchInfo(cleanPrefill);
      } else if (!ytUrlInput.value.trim()) {
        bridge.ytReadClipboard('modal-open');
        setTimeout(() => ytUrlInput.focus(), 30);
      }
    }

    function close() {
      ytModal.classList.add('hidden');
      if (btnYoutubeHeader) btnYoutubeHeader.setAttribute('aria-expanded', 'false');
    }

    function isOpen() {
      return !ytModal.classList.contains('hidden');
    }

    function fetchInfo(rawUrl) {
      const targetUrl = String(rawUrl !== undefined ? rawUrl : ytUrlInput.value || '').trim();
      if (!targetUrl) {
        setFetchBanner('YouTube 동영상 또는 Shorts 링크를 붙여넣어 주세요.', true);
        ytUrlInput.focus();
        return;
      }
      if (!bridge.isDesktop) return;

      isFetching = true;
      btnYtFetch.disabled = true;
      btnYtFetch.textContent = '조회 중...';
      setFetchBanner('유튜브 영상 정보 및 지원 해상도를 불러오는 중...', false);
      bridge.ytFetchInfo(targetUrl);
    }

    function startDownload() {
      if (isDownloading) return;
      const targetUrl = (currentInfo && currentInfo.webpageUrl) || ytUrlInput.value.trim();
      if (!targetUrl) {
        showToast('먼저 유튜브 링크를 조회해 주세요', 'warn');
        return;
      }

      const isMp3 = selectedFormat === 'mp3';
      const qualLabel = isMp3
        ? (selectedBitrate + 'kbps')
        : (selectedResolution ? selectedResolution.label : '최고 화질');

      isDownloading = true;
      ytDlProgressBox.classList.remove('hidden');
      ytDlStatusText.textContent = '다운로드 준비 중...';
      ytDlStatsText.textContent = '';
      ytDlProgressFill.style.width = '0%';
      ytHeaderBadge.textContent = '0%';
      ytHeaderBadge.classList.remove('hidden');
      updateStartButtonLabel();

      bridge.ytDownload({
        url: targetUrl,
        format: isMp3 ? 'mp3' : 'mp4',
        maxHeight: (!isMp3 && selectedResolution) ? selectedResolution.height : 0,
        shortSide: (!isMp3 && selectedResolution) ? selectedResolution.shortSide : 0,
        audioBitrate: selectedBitrate,
        saveDir: saveDir,
        autoPlay: toggleYtAutoplay.checked,
        title: currentInfo ? currentInfo.title : '',
        thumbnail: currentInfo ? currentInfo.thumbnail : '',
        qualityLabel: qualLabel
      });
    }

    // Event bindings
    if (btnYoutubeHeader) {
      btnYoutubeHeader.addEventListener('click', () => {
        if (isOpen()) close();
        else open();
      });
    }

    if (btnYtClose) btnYtClose.addEventListener('click', close);
    ytModal.addEventListener('click', (e) => {
      if (e.target === ytModal) close();
    });

    if (btnWelcomeYtGo) {
      btnWelcomeYtGo.addEventListener('click', () => {
        const val = welcomeYtInput ? welcomeYtInput.value.trim() : '';
        if (val) welcomeYtInput.value = '';
        open(val);
      });
    }

    if (welcomeYtInput) {
      welcomeYtInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = welcomeYtInput.value.trim();
          if (val) welcomeYtInput.value = '';
          open(val);
        }
      });
      welcomeYtInput.addEventListener('paste', () => {
        setTimeout(() => {
          const val = welcomeYtInput.value.trim();
          if (looksLikeYoutubeUrl(val)) {
            welcomeYtInput.value = '';
            open(val);
          }
        }, 20);
      });
    }

    ytUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchInfo();
      }
    });

    ytUrlInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = ytUrlInput.value.trim();
        if (looksLikeYoutubeUrl(val)) {
          fetchInfo(val);
        }
      }, 20);
    });

    btnYtPaste.addEventListener('click', () => {
      if (bridge.isDesktop) bridge.ytReadClipboard('paste-btn');
    });

    btnYtFetch.addEventListener('click', () => fetchInfo());

    btnYtFmtMp4.addEventListener('click', () => {
      selectedFormat = 'mp4';
      utils.storage.set('ytFormat', 'mp4');
      syncFormatTabs();
    });

    btnYtFmtMp3.addEventListener('click', () => {
      selectedFormat = 'mp3';
      utils.storage.set('ytFormat', 'mp3');
      syncFormatTabs();
    });

    ytMp3QualGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.yt-qual-chip');
      if (!chip) return;
      selectedBitrate = Number(chip.dataset.bitrate) || 320;
      utils.storage.set('ytAudioBitrate', selectedBitrate);
      syncMp3Chips();
      updateStartButtonLabel();
    });

    btnYtChangeDir.addEventListener('click', () => {
      if (bridge.isDesktop) bridge.ytChooseFolder();
    });

    btnYtOpenDir.addEventListener('click', () => {
      if (bridge.isDesktop) bridge.ytOpenFolder(saveDir);
    });

    toggleYtAutoplay.addEventListener('change', () => {
      autoPlay = toggleYtAutoplay.checked;
      if (bridge.isDesktop) {
        bridge.ytSaveSettings({ saveDir: saveDir, autoPlay: autoPlay });
      }
    });

    btnYtEngineUpdate.addEventListener('click', () => {
      if (!bridge.isDesktop) return;
      btnYtEngineUpdate.disabled = true;
      setFetchBanner('yt-dlp 최신 엔진 확인 및 업데이트 중...', false, 10);
      bridge.ytUpdateEngine();
    });

    btnYtStart.addEventListener('click', startDownload);
    btnYtCancel.addEventListener('click', () => {
      if (bridge.isDesktop) bridge.ytCancel();
    });

    // Bridge handlers
    bridge.on('yt:state', (msg) => {
      saveDir = msg.saveDir || saveDir;
      if (typeof msg.autoPlay === 'boolean') {
        autoPlay = msg.autoPlay;
        toggleYtAutoplay.checked = autoPlay;
      }
      if (saveDir) {
        ytSaveDirText.textContent = saveDir;
        ytSaveDirText.title = saveDir;
      }

      isDownloading = Boolean(msg.busy);
      btnYtEngineUpdate.disabled = isDownloading;

      const readyAll = Boolean(msg.hasYtdlp && msg.hasQuickJs && msg.hasFfmpeg);
      const readyCore = Boolean(msg.hasYtdlp && msg.hasQuickJs);
      if (readyAll) {
        ytEngineBadge.textContent = '엔진 준비 완료';
        ytEngineBadge.className = 'status-tag status-ok';
      } else if (readyCore) {
        ytEngineBadge.textContent = 'FFmpeg 다운로드 시 자동 설치';
        ytEngineBadge.className = 'status-tag';
      } else {
        ytEngineBadge.textContent = '첫 사용 시 자동 구성';
        ytEngineBadge.className = 'status-tag';
      }

      if (!isDownloading) {
        ytHeaderBadge.classList.add('hidden');
      }
      updateStartButtonLabel();
    });

    bridge.on('yt:clipboard', (msg) => {
      if (!msg.valid || !msg.url) {
        if (msg.reason === 'paste-btn') {
          showToast('클립보드에 유효한 YouTube 링크가 없습니다', 'warn');
        }
        return;
      }
      if (msg.reason === 'global-paste') {
        open(msg.url);
        showToast('클립보드의 유튜브 링크를 감지했습니다', 'accent');
        return;
      }
      if (msg.reason === 'paste-btn' || (msg.reason === 'modal-open' && !ytUrlInput.value.trim())) {
        ytUrlInput.value = msg.url;
        fetchInfo(msg.url);
      }
    });

    bridge.on('yt:engineProgress', (msg) => {
      const pct = Number(msg.percent) || 0;
      const text = msg.message || '다운로드 엔진 자동 준비 중...';
      if (isDownloading) {
        ytDlStatusText.textContent = text;
        ytDlProgressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        ytHeaderBadge.textContent = Math.round(pct) + '%';
      } else {
        setFetchBanner(text, false, pct);
      }
      if (pct >= 100 && msg.stage === 'ready') {
        btnYtEngineUpdate.disabled = false;
        if (!isFetching && !isDownloading) {
          setFetchBanner('', false);
        }
      }
    });

    bridge.on('yt:infoResult', (msg) => {
      isFetching = false;
      btnYtFetch.disabled = false;
      btnYtFetch.textContent = '조회';
      btnYtEngineUpdate.disabled = false;

      if (!msg.success) {
        setFetchBanner(msg.error || '영상 정보를 가져오지 못했습니다.', true);
        return;
      }

      setFetchBanner('', false);
      currentInfo = {
        id: msg.id || '',
        title: msg.title || 'YouTube Media',
        channel: msg.channel || '',
        duration: Number(msg.duration) || 0,
        thumbnail: msg.thumbnail || '',
        webpageUrl: msg.webpageUrl || ytUrlInput.value.trim(),
        resolutions: Array.isArray(msg.resolutions) ? msg.resolutions : []
      };

      ytVideoTitle.textContent = currentInfo.title;
      ytVideoChannel.textContent = currentInfo.channel || 'YouTube';
      if (currentInfo.duration > 0) {
        ytDurationBadge.textContent = utils.formatTime(currentInfo.duration);
        ytDurationBadge.classList.remove('hidden');
      } else {
        ytDurationBadge.classList.add('hidden');
      }
      if (currentInfo.thumbnail) {
        ytThumbImg.src = currentInfo.thumbnail;
        ytThumbImg.classList.remove('hidden');
      } else {
        ytThumbImg.classList.add('hidden');
      }

      ytPreviewSection.classList.remove('hidden');
      renderResolutionGrid(currentInfo.resolutions);
      syncFormatTabs();
    });

    bridge.on('yt:progress', (msg) => {
      isDownloading = true;
      ytDlProgressBox.classList.remove('hidden');
      const pct = Math.max(0, Math.min(100, Number(msg.percent) || 0));
      ytDlProgressFill.style.width = pct + '%';
      ytDlStatusText.textContent = msg.message || '다운로드 중...';

      const stats = [];
      stats.push(Math.round(pct) + '%');
      if (msg.sizeText) stats.push(msg.sizeText);
      if (msg.speed) stats.push(msg.speed);
      if (msg.eta) stats.push('남은 시간 ' + msg.eta);
      ytDlStatsText.textContent = stats.join(' · ');

      ytHeaderBadge.textContent = msg.phase === 'postprocess' ? '변환' : (Math.round(pct) + '%');
      ytHeaderBadge.classList.remove('hidden');
      updateStartButtonLabel();
    });

    bridge.on('yt:done', (msg) => {
      isDownloading = false;
      ytDlProgressFill.style.width = '100%';
      ytDlStatusText.textContent = '다운로드 완료: ' + (msg.fileName || '');
      ytDlStatsText.textContent = msg.fileSize > 0 ? utils.formatBytes(msg.fileSize) : '완료';
      ytHeaderBadge.classList.add('hidden');
      setTimeout(() => {
        if (!isDownloading) ytDlProgressBox.classList.add('hidden');
      }, 2600);

      const entry = {
        filePath: msg.filePath,
        fileName: msg.fileName,
        format: msg.format,
        fileSize: msg.fileSize,
        title: msg.title || msg.fileName,
        qualityLabel: msg.qualityLabel || '',
        createdAt: Date.now()
      };
      ytHistory = [entry].concat(ytHistory.filter((x) => x && x.filePath !== entry.filePath)).slice(0, 8);
      utils.storage.set('ytHistory', ytHistory);
      renderHistory();
      updateStartButtonLabel();

      if (msg.autoPlay) {
        close();
      }
    });

    bridge.on('yt:error', (msg) => {
      isDownloading = false;
      ytDlProgressBox.classList.add('hidden');
      ytHeaderBadge.classList.add('hidden');
      setFetchBanner(msg.error || '다운로드 중 오류가 발생했습니다.', true);
      updateStartButtonLabel();
    });

    bridge.on('yt:cancelled', () => {
      isDownloading = false;
      ytDlProgressBox.classList.add('hidden');
      ytHeaderBadge.classList.add('hidden');
      updateStartButtonLabel();
    });

    return {
      open: open,
      close: close,
      isOpen: isOpen,
      requestGlobalClipboardCheck: function () {
        if (bridge.isDesktop) bridge.ytReadClipboard('global-paste');
      }
    };
  }

  Aether.createYoutubeDownloader = createYoutubeDownloader;
})(window);
