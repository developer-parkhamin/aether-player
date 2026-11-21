(function (global) {
  'use strict';

  const Aether = (global.Aether = global.Aether || {});
  const webview = global.chrome && global.chrome.webview ? global.chrome.webview : null;
  const listeners = new Map();

  function emit(type, data) {
    const set = listeners.get(type);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error('[AetherBridge] listener error:', err);
        }
      });
    }
    const wild = listeners.get('*');
    if (wild) {
      wild.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error('[AetherBridge] wildcard error:', err);
        }
      });
    }
  }

  if (webview) {
    webview.addEventListener('message', (event) => {
      let msg = event.data;
      if (typeof msg === 'string') {
        try {
          msg = JSON.parse(msg);
        } catch {
          return;
        }
      }
      if (msg && typeof msg === 'object' && msg.type) {
        emit(msg.type, msg);
      }
    });
  }

  function send(type, payload) {
    if (!webview) return false;
    try {
      webview.postMessage(Object.assign({ type: type }, payload || {}));
      return true;
    } catch (err) {
      console.warn('[AetherBridge] postMessage failed:', err);
      return false;
    }
  }

  function on(type, handler) {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type).add(handler);
    return function unsubscribe() {
      const set = listeners.get(type);
      if (set) set.delete(handler);
    };
  }

  Aether.bridge = {
    isDesktop: Boolean(webview),
    on: on,
    send: send,
    ready: function () { return send('ui:ready'); },
    startDrag: function () { return send('window:drag'); },
    startResize: function (hit) { return send('window:resize', { hit: Number(hit) || 17 }); },
    minimize: function () { return send('window:minimize'); },
    toggleMaximize: function () { return send('window:toggleMaximize'); },
    toggleFullscreen: function () { return send('window:toggleFullscreen'); },
    close: function () { return send('window:close'); },
    setTopMost: function (enabled) { return send('window:setTopMost', { enabled: Boolean(enabled) }); },
    setTitle: function (title) { return send('window:setTitle', { title: String(title || '') }); },
    enterPiP: function (opts) { return send('pip:enter', opts || {}); },
    exitPiP: function () { return send('pip:exit'); },
    snapPiP: function (corner) { return send('pip:snap', { corner: corner || 'br' }); },
    presetPiPSize: function (preset, ratio) {
      return send('pip:presetSize', { preset: preset || 'm', ratio: Number(ratio) || 0 });
    },
    fitAspect: function (ratio) { return send('pip:fitAspect', { ratio: Number(ratio) || 0 }); },
    setPiPAspect: function (ratio, lockAspect, fitNow) {
      return send('pip:setAspect', { ratio: Number(ratio) || 0, lockAspect: Boolean(lockAspect), fitNow: Boolean(fitNow) });
    },
    setPiPOpacity: function (opacity) { return send('pip:setOpacity', { opacity: Number(opacity) }); },
    setGhost: function (enabled) { return send('pip:setGhost', { enabled: Boolean(enabled) }); },
    setGlobalHotkeys: function (enabled) { return send('pip:setGlobalHotkeys', { enabled: Boolean(enabled) }); },
    openFiles: function () { return send('dialog:openFiles'); },
    openFolder: function () { return send('dialog:openFolder'); },
    openPaths: function (paths) { return send('files:openPaths', { paths: paths || [] }); },
    savePlaylist: function (entries) { return send('dialog:savePlaylist', { entries: entries || [] }); },
    openPlaylist: function () { return send('dialog:openPlaylist'); },
    saveScreenshot: function (filename, dataUrl) {
      return send('dialog:saveScreenshot', { filename: filename, dataUrl: dataUrl });
    },
    getAssocStatus: function () { return send('assoc:status'); },
    setAssoc: function (enabled) { return send('assoc:set', { enabled: Boolean(enabled) }); },
    openAssocSettings: function () { return send('assoc:openSettings'); },
    getUpdateConfig: function () { return send('update:getConfig'); },
    saveUpdateConfig: function (cfg) { return send('update:saveConfig', cfg || {}); },
    checkUpdates: function () { return send('update:check'); },
    downloadAndInstallUpdate: function () { return send('update:downloadAndInstall'); },
    ytGetState: function () { return send('yt:getState'); },
    ytReadClipboard: function (reason) { return send('yt:readClipboard', { reason: reason || 'paste' }); },
    ytChooseFolder: function () { return send('yt:chooseFolder'); },
    ytOpenFolder: function (path) { return send('yt:openFolder', { path: String(path || '') }); },
    ytRevealFile: function (path) { return send('yt:revealFile', { path: String(path || '') }); },
    ytSaveSettings: function (settings) { return send('yt:saveSettings', settings || {}); },
    ytUpdateEngine: function () { return send('yt:updateEngine'); },
    ytFetchInfo: function (url) { return send('yt:fetchInfo', { url: String(url || '') }); },
    ytDownload: function (opts) { return send('yt:download', opts || {}); },
    ytCancel: function () { return send('yt:cancel'); }
  };
})(window);
