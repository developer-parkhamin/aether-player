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
    const btnYtEnqueue = document.getElementById('btn-yt-enqueue');
    const btnYtQuickStart = document.getElementById('btn-yt-quick-start');

    const ytSaveDirText = document.getElementById('yt-save-dir-text');
    const btnYtChangeDir = document.getElementById('btn-yt-change-dir');
    const btnYtOpenDir = document.getElementById('btn-yt-open-dir');
    const toggleYtAutoplay = document.getElementById('toggle-yt-autoplay');

    const ytQueueSection = document.getElementById('yt-queue-section');
    const ytQueueSummary = document.getElementById('yt-queue-summary');
    const btnYtQueueStart = document.getElementById('btn-yt-queue-start');
    const btnYtQueueStop = document.getElementById('btn-yt-queue-stop');
    const btnYtQueuePlayAll = document.getElementById('btn-yt-queue-play-all');
    const btnYtQueueClearDone = document.getElementById('btn-yt-queue-clear-done');
    const btnYtQueueClear = document.getElementById('btn-yt-queue-clear');
    const ytQueueEmpty = document.getElementById('yt-queue-empty');
    const ytQueueList = document.getElementById('yt-queue-list');

    const YT_REGEX = /(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)/i;

    let jobSeq = 1;
    let currentInfo = null;
    let selectedFormat = utils.storage.get('ytFormat', 'mp4');
    let selectedResolution = null;
    let selectedBitrate = Number(utils.storage.get('ytAudioBitrate', 320)) || 320;
    let isFetching = false;
    let queueRunning = false;
    let activeJobId = null;
    let stopRequested = false;
    let saveDir = '';
    let autoPlay = true;
    let batchCompletedPaths = [];
    let batchTotal = 0;

    let queue = loadInitialQueue();

    function loadInitialQueue() {
      const raw = utils.storage.get('ytQueue', []);
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((x) => x && typeof x === 'object' && x.url)
        .slice(0, 30)
        .map((x) => Object.assign({}, x, {
          status: x.status === 'downloading' ? 'pending' : (x.status || 'pending'),
          percent: x.status === 'done' ? 100 : 0,
          statusText: x.status === 'done' ? '완료' : (x.status === 'error' ? (x.error || '실패') : '대기 중'),
          statsText: x.fileSize > 0 && x.status === 'done' ? utils.formatBytes(x.fileSize) : ''
        }));
    }

    function persistQueue() {
      const compact = queue.slice(-30).map((item) => ({
        jobId: item.jobId,
        url: item.url,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail,
        duration: item.duration,
        format: item.format,
        maxHeight: item.maxHeight,
        shortSide: item.shortSide,
        audioBitrate: item.audioBitrate,
        qualityLabel: item.qualityLabel,
        status: item.status === 'downloading' ? 'pending' : item.status,
        filePath: item.filePath || '',
        fileName: item.fileName || '',
        fileSize: item.fileSize || 0,
        error: item.error || ''
      }));
      utils.storage.set('ytQueue', compact);
    }

    function nextJobId() {
      jobSeq += 1;
      return 'yt-' + Date.now().toString(36) + '-' + jobSeq;
    }

    function looksLikeYoutubeUrl(raw) {
      return YT_REGEX.test(String(raw || '').trim());
    }

    function findJob(jobId) {
      if (!jobId) return null;
      return queue.find((item) => item.jobId === jobId) || null;
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

    function getCurrentSelectionSummary() {
      if (selectedFormat === 'mp3') {
        return 'MP3 ' + selectedBitrate + ' kbps';
      }
      if (selectedResolution) {
        return 'MP4 ' + selectedResolution.label;
      }
      return 'MP4 최고 화질';
    }

    function updatePreviewButtons() {
      const hasInfo = Boolean(currentInfo);
      btnYtEnqueue.disabled = !hasInfo;
      btnYtQuickStart.disabled = !hasInfo;
      if (!hasInfo) {
        btnYtEnqueue.textContent = '+ 목록에 추가';
        btnYtQuickStart.textContent = '바로 받기';
        return;
      }
      btnYtEnqueue.textContent = '+ 목록에 추가 (' + getCurrentSelectionSummary() + ')';
      btnYtQuickStart.textContent = (queueRunning || activeJobId) ? '목록 추가 후 이어받기' : '바로 받기';
    }

    function syncFormatTabs() {
      const isMp3 = selectedFormat === 'mp3';
      btnYtFmtMp4.classList.toggle('active', !isMp3);
      btnYtFmtMp3.classList.toggle('active', isMp3);
      ytMp4ResGrid.classList.toggle('hidden', isMp3);
      ytMp3QualGrid.classList.toggle('hidden', !isMp3);
      updatePreviewButtons();
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
        updatePreviewButtons();
        return;
      }

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
          updatePreviewButtons();
        });

        ytMp4ResGrid.appendChild(chip);
        if (idx === defaultIdx) selectedResolution = opt;
      });

      updatePreviewButtons();
    }

    function updateHeaderBadge() {
      const pending = queue.filter((x) => x.status === 'pending').length;
      const activeItem = activeJobId ? findJob(activeJobId) : null;
      if (activeItem) {
        const doneInBatch = Math.min(batchTotal, batchCompletedPaths.length + 1);
        const pct = Math.round(Number(activeItem.percent) || 0);
        const prefix = batchTotal > 1 ? (doneInBatch + '/' + batchTotal + ' · ') : '';
        ytHeaderBadge.textContent = activeItem.phase === 'postprocess' ? (prefix + '변환') : (prefix + pct + '%');
        ytHeaderBadge.classList.remove('hidden');
      } else if (pending > 0) {
        ytHeaderBadge.textContent = '대기 ' + pending;
        ytHeaderBadge.classList.remove('hidden');
      } else {
        ytHeaderBadge.classList.add('hidden');
      }
    }

    function updateQueueControls() {
      const pendingCount = queue.filter((x) => x.status === 'pending').length;
      const doneCount = queue.filter((x) => x.status === 'done').length;
      const errCount = queue.filter((x) => x.status === 'error' || x.status === 'cancelled').length;
      const active = Boolean(activeJobId || queueRunning);

      const parts = [];
      if (active) parts.push('진행 중');
      if (pendingCount > 0) parts.push('대기 ' + pendingCount);
      if (doneCount > 0) parts.push('완료 ' + doneCount);
      if (errCount > 0) parts.push('실패·취소 ' + errCount);
      ytQueueSummary.textContent = parts.length ? parts.join(' · ') : '0개';

      btnYtQueueStart.classList.toggle('hidden', active || pendingCount === 0);
      btnYtQueueStart.textContent = pendingCount > 1 ? ('목록 다운로드 시작 (' + pendingCount + ')') : '다운로드 시작 (1)';
      btnYtQueueStop.classList.toggle('hidden', !active);
      btnYtQueuePlayAll.classList.toggle('hidden', doneCount === 0);
      btnYtQueuePlayAll.textContent = doneCount > 1 ? ('완료 전체 재생 (' + doneCount + ')') : '완료 재생';
      btnYtQueueClearDone.classList.toggle('hidden', doneCount === 0);
      btnYtQueueClear.classList.toggle('hidden', active || queue.length === 0);

      ytQueueEmpty.classList.toggle('hidden', queue.length > 0);
      ytQueueList.classList.toggle('hidden', queue.length === 0);
      ytQueueSection.classList.remove('hidden');
      updateHeaderBadge();
    }

    function renderQueue() {
      ytQueueList.innerHTML = '';

      queue.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'yt-queue-item';
        row.dataset.jobId = item.jobId;
        if (item.status === 'downloading') row.classList.add('is-active');
        else if (item.status === 'done') row.classList.add('is-done');
        else if (item.status === 'error' || item.status === 'cancelled') row.classList.add('is-error');

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'yt-queue-thumb';
        if (item.thumbnail) {
          const img = document.createElement('img');
          img.src = item.thumbnail;
          img.alt = '';
          thumbWrap.appendChild(img);
        } else {
          const idxSpan = document.createElement('span');
          idxSpan.className = 'mono';
          idxSpan.textContent = String(idx + 1);
          thumbWrap.appendChild(idxSpan);
        }

        const info = document.createElement('div');
        info.className = 'yt-queue-info';

        const top = document.createElement('div');
        top.className = 'yt-queue-top';

        const numEl = document.createElement('span');
        numEl.className = 'yt-queue-num mono';
        numEl.textContent = '#' + (idx + 1);

        const extBadge = document.createElement('span');
        extBadge.className = 'format-badge';
        extBadge.dataset.ext = item.format || 'mp4';
        extBadge.textContent = item.format === 'mp3'
          ? ('MP3 ' + (item.audioBitrate || 320) + 'k')
          : ('MP4 ' + (item.shortSide ? (item.shortSide + 'p') : 'MAX'));

        const titleEl = document.createElement('strong');
        titleEl.className = 'yt-queue-title';
        titleEl.textContent = item.title || item.fileName || 'YouTube Media';
        titleEl.title = item.title || '';

        top.appendChild(numEl);
        top.appendChild(extBadge);
        top.appendChild(titleEl);

        const statusRow = document.createElement('div');
        statusRow.className = 'yt-queue-sub';
        const statusTextEl = document.createElement('span');
        statusTextEl.className = 'yt-queue-status';
        if (item.status === 'downloading') {
          statusTextEl.textContent = item.statusText || '다운로드 중...';
        } else if (item.status === 'done') {
          statusTextEl.textContent = '완료 · ' + (item.qualityLabel || (item.format || 'mp4').toUpperCase());
        } else if (item.status === 'error') {
          statusTextEl.textContent = '오류: ' + (item.error || '다운로드 실패');
        } else if (item.status === 'cancelled') {
          statusTextEl.textContent = '취소됨';
        } else {
          statusTextEl.textContent = '대기 중 · ' + (item.qualityLabel || '');
        }

        const statsEl = document.createElement('span');
        statsEl.className = 'yt-queue-stats mono';
        if (item.status === 'done') {
          statsEl.textContent = item.fileSize > 0 ? utils.formatBytes(item.fileSize) : '';
        } else if (item.status === 'downloading') {
          statsEl.textContent = item.statsText || '';
        }

        statusRow.appendChild(statusTextEl);
        statusRow.appendChild(statsEl);

        info.appendChild(top);
        info.appendChild(statusRow);

        if (item.status === 'downloading') {
          const barTrack = document.createElement('div');
          barTrack.className = 'yt-progress-track yt-queue-bar';
          const barFill = document.createElement('div');
          barFill.className = 'yt-progress-fill yt-queue-bar-fill';
          barFill.style.width = Math.max(0, Math.min(100, Number(item.percent) || 0)) + '%';
          barTrack.appendChild(barFill);
          info.appendChild(barTrack);
        }

        const actions = document.createElement('div');
        actions.className = 'yt-queue-actions';

        if (item.status === 'downloading') {
          const skipBtn = document.createElement('button');
          skipBtn.type = 'button';
          skipBtn.className = 'tool-pill-btn';
          skipBtn.textContent = '건너뛰기';
          skipBtn.title = '현재 항목만 중단하고 다음 항목으로 넘어갑니다';
          skipBtn.addEventListener('click', () => {
            stopRequested = false;
            if (bridge.isDesktop) bridge.ytCancel({ jobId: item.jobId });
          });
          actions.appendChild(skipBtn);
        } else if (item.status === 'done') {
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

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'tool-icon-btn yt-remove-btn';
          delBtn.title = '목록에서 제거';
          delBtn.textContent = '✕';
          delBtn.addEventListener('click', () => removeJob(item.jobId));

          actions.appendChild(playBtn);
          actions.appendChild(dirBtn);
          actions.appendChild(delBtn);
        } else {
          if (item.status === 'error' || item.status === 'cancelled') {
            const retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.className = 'tool-pill-btn tool-pill-accent';
            retryBtn.textContent = '재시도';
            retryBtn.addEventListener('click', () => {
              item.status = 'pending';
              item.percent = 0;
              item.error = '';
              item.statusText = '대기 중';
              item.statsText = '';
              persistQueue();
              renderQueue();
              if (!queueRunning && !activeJobId) startQueue();
            });
            actions.appendChild(retryBtn);
          }

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'tool-icon-btn yt-remove-btn';
          delBtn.title = '목록에서 제거';
          delBtn.textContent = '✕';
          delBtn.addEventListener('click', () => removeJob(item.jobId));
          actions.appendChild(delBtn);
        }

        row.appendChild(thumbWrap);
        row.appendChild(info);
        row.appendChild(actions);
        ytQueueList.appendChild(row);
      });

      updateQueueControls();
    }

    function updateActiveRowInPlace(item) {
      if (!item) return;
      const row = ytQueueList.querySelector('[data-job-id="' + item.jobId + '"]');
      if (!row) {
        renderQueue();
        return;
      }
      const statusEl = row.querySelector('.yt-queue-status');
      const statsEl = row.querySelector('.yt-queue-stats');
      const fillEl = row.querySelector('.yt-queue-bar-fill');
      if (statusEl) statusEl.textContent = item.statusText || '다운로드 중...';
      if (statsEl) statsEl.textContent = item.statsText || '';
      if (fillEl) fillEl.style.width = Math.max(0, Math.min(100, Number(item.percent) || 0)) + '%';
      updateHeaderBadge();
    }

    function removeJob(jobId) {
      queue = queue.filter((x) => x.jobId !== jobId || x.status === 'downloading');
      persistQueue();
      renderQueue();
    }

    function addCurrentToQueue(startImmediately) {
      if (!currentInfo) {
        showToast('먼저 유튜브 링크를 조회해 주세요', 'warn');
        return;
      }

      const isMp3 = selectedFormat === 'mp3';
      const maxHeight = (!isMp3 && selectedResolution) ? selectedResolution.height : 0;
      const shortSide = (!isMp3 && selectedResolution) ? selectedResolution.shortSide : 0;
      const bitrate = isMp3 ? selectedBitrate : 0;
      const targetUrl = currentInfo.webpageUrl || ytUrlInput.value.trim();

      const dup = queue.find((x) =>
        (x.status === 'pending' || x.status === 'downloading') &&
        x.url === targetUrl &&
        x.format === (isMp3 ? 'mp3' : 'mp4') &&
        x.maxHeight === maxHeight &&
        (x.audioBitrate || 0) === bitrate
      );

      if (dup) {
        showToast('이미 대기 목록에 같은 형식으로 담겨 있습니다', 'warn');
        if (startImmediately && !queueRunning && !activeJobId) startQueue();
        return;
      }

      const job = {
        jobId: nextJobId(),
        url: targetUrl,
        title: currentInfo.title || 'YouTube Media',
        channel: currentInfo.channel || '',
        thumbnail: currentInfo.thumbnail || '',
        duration: currentInfo.duration || 0,
        format: isMp3 ? 'mp3' : 'mp4',
        maxHeight: maxHeight,
        shortSide: shortSide,
        audioBitrate: bitrate,
        qualityLabel: isMp3
          ? (bitrate + ' kbps MP3')
          : (selectedResolution ? selectedResolution.label : '최고 화질 MP4'),
        status: 'pending',
        percent: 0,
        phase: 'download',
        statusText: '대기 중',
        statsText: '',
        filePath: '',
        fileName: '',
        fileSize: 0,
        error: ''
      };

      queue.push(job);
      if (queueRunning) batchTotal += 1;
      persistQueue();

      // Clear URL & preview so user can immediately add another link cleanly
      currentInfo = null;
      ytPreviewSection.classList.add('hidden');
      ytUrlInput.value = '';
      setFetchBanner('', false);
      updatePreviewButtons();
      renderQueue();

      showToast('목록에 추가됨: ' + job.title, 'accent');

      if (startImmediately) {
        if (!queueRunning && !activeJobId) {
          startQueue();
        }
      } else {
        setTimeout(() => ytUrlInput.focus(), 20);
      }
    }

    function startQueue() {
      const pending = queue.filter((x) => x.status === 'pending');
      if (pending.length === 0) {
        showToast('다운로드 대기 중인 항목이 없습니다', 'warn');
        return;
      }
      if (queueRunning && activeJobId) return;

      queueRunning = true;
      stopRequested = false;
      batchCompletedPaths = [];
      batchTotal = pending.length;
      renderQueue();
      dispatchNextJob();
    }

    function dispatchNextJob() {
      if (!queueRunning || activeJobId !== null) return;

      const next = queue.find((x) => x.status === 'pending');
      if (!next) {
        queueRunning = false;
        const finishedPaths = batchCompletedPaths.slice();
        batchCompletedPaths = [];
        batchTotal = 0;
        persistQueue();
        renderQueue();

        if (finishedPaths.length > 0) {
          if (toggleYtAutoplay.checked && bridge.isDesktop) {
            bridge.openPaths(finishedPaths);
            showToast(finishedPaths.length + '개 항목 다운로드 완료 · 바로 재생합니다', 'accent');
            if (isOpen()) close();
          } else {
            showToast('목록 다운로드 완료 (' + finishedPaths.length + '개)', 'accent');
          }
        }
        return;
      }

      next.status = 'downloading';
      next.percent = 0;
      next.phase = 'download';
      next.statusText = '다운로드 준비 중...';
      next.statsText = '';
      activeJobId = next.jobId;
      renderQueue();

      bridge.ytDownload({
        jobId: next.jobId,
        url: next.url,
        format: next.format,
        maxHeight: next.maxHeight,
        shortSide: next.shortSide,
        audioBitrate: next.audioBitrate || 320,
        saveDir: saveDir,
        autoPlay: false,
        title: next.title,
        thumbnail: next.thumbnail,
        qualityLabel: next.qualityLabel
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
      syncFormatTabs();
      syncMp3Chips();
      updatePreviewButtons();
      renderQueue();

      const cleanPrefill = String(prefillUrl || '').trim();
      if (cleanPrefill) {
        ytUrlInput.value = cleanPrefill;
        fetchInfo(cleanPrefill);
      } else if (!ytUrlInput.value.trim() && !currentInfo) {
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
      updatePreviewButtons();
    });

    btnYtEnqueue.addEventListener('click', () => addCurrentToQueue(false));
    btnYtQuickStart.addEventListener('click', () => addCurrentToQueue(true));

    btnYtQueueStart.addEventListener('click', startQueue);

    btnYtQueueStop.addEventListener('click', () => {
      stopRequested = true;
      queueRunning = false;
      if (bridge.isDesktop) bridge.ytCancel({ jobId: activeJobId || '' });
    });

    btnYtQueuePlayAll.addEventListener('click', () => {
      const paths = queue.filter((x) => x.status === 'done' && x.filePath).map((x) => x.filePath);
      if (paths.length > 0 && bridge.isDesktop) {
        bridge.openPaths(paths);
        close();
      }
    });

    btnYtQueueClearDone.addEventListener('click', () => {
      queue = queue.filter((x) => x.status !== 'done');
      persistQueue();
      renderQueue();
    });

    btnYtQueueClear.addEventListener('click', () => {
      if (queueRunning || activeJobId) return;
      queue = [];
      persistQueue();
      renderQueue();
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

      const busyNow = Boolean(msg.busy);
      btnYtEngineUpdate.disabled = busyNow;

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

      if (!busyNow && activeJobId && !queueRunning) {
        activeJobId = null;
      }
      updateQueueControls();
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
      if (msg.reason === 'paste-btn' || (msg.reason === 'modal-open' && !ytUrlInput.value.trim() && !currentInfo)) {
        ytUrlInput.value = msg.url;
        fetchInfo(msg.url);
      }
    });

    bridge.on('yt:engineProgress', (msg) => {
      const pct = Number(msg.percent) || 0;
      const text = msg.message || '다운로드 엔진 자동 준비 중...';
      const activeItem = activeJobId ? findJob(activeJobId) : null;
      if (activeItem) {
        activeItem.percent = pct;
        activeItem.phase = 'engine';
        activeItem.statusText = text;
        updateActiveRowInPlace(activeItem);
      } else {
        setFetchBanner(text, false, pct);
      }
      if (pct >= 100 && msg.stage === 'ready') {
        btnYtEngineUpdate.disabled = false;
        if (!isFetching && !activeItem) {
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
      const item = findJob(msg.jobId || activeJobId);
      if (!item) return;

      const pct = Math.max(0, Math.min(100, Number(msg.percent) || 0));
      item.status = 'downloading';
      item.phase = msg.phase || 'download';
      item.percent = pct;
      item.statusText = msg.message || '다운로드 중...';

      const stats = [Math.round(pct) + '%'];
      if (msg.sizeText) stats.push(msg.sizeText);
      if (msg.speed) stats.push(msg.speed);
      if (msg.eta) stats.push('남은 시간 ' + msg.eta);
      item.statsText = stats.join(' · ');

      updateActiveRowInPlace(item);
    });

    bridge.on('yt:done', (msg) => {
      const item = findJob(msg.jobId || activeJobId);
      if (item) {
        item.status = 'done';
        item.percent = 100;
        item.filePath = msg.filePath || '';
        item.fileName = msg.fileName || '';
        item.fileSize = Number(msg.fileSize) || 0;
        item.statusText = '완료';
        item.statsText = item.fileSize > 0 ? utils.formatBytes(item.fileSize) : '';
        if (item.filePath) batchCompletedPaths.push(item.filePath);
      }

      activeJobId = null;
      persistQueue();
      renderQueue();
      dispatchNextJob();
    });

    bridge.on('yt:error', (msg) => {
      const item = findJob(msg.jobId || activeJobId);
      if (item) {
        item.status = 'error';
        item.error = msg.error || '다운로드 실패';
        item.statusText = '오류: ' + item.error;
        item.statsText = '';
      }
      activeJobId = null;
      persistQueue();
      renderQueue();
      if (queueRunning) {
        dispatchNextJob();
      }
    });

    bridge.on('yt:cancelled', (msg) => {
      const item = findJob(msg.jobId || activeJobId);
      if (item) {
        item.status = 'cancelled';
        item.statusText = '취소됨';
        item.statsText = '';
      }
      activeJobId = null;
      if (stopRequested) {
        queueRunning = false;
        stopRequested = false;
        batchCompletedPaths = [];
        batchTotal = 0;
        persistQueue();
        renderQueue();
      } else if (queueRunning) {
        persistQueue();
        renderQueue();
        dispatchNextJob();
      } else {
        persistQueue();
        renderQueue();
      }
    });

    // Render persisted queue on startup so badge/status reflect pending items
    updateHeaderBadge();

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
