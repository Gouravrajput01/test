'use client';

import { logViolation } from './firebase';

// =============================================
// PROCTORING ENGINE (AI + Basic Monitoring)
// =============================================

class ProctoringEngine {
  constructor(userId, options = {}) {
    this.userId = userId;
    this.options = {
      enableAI: options.enableAI !== undefined ? options.enableAI : false,
      enableAudio: options.enableAudio !== undefined ? options.enableAudio : false,
      enableVisual: options.enableVisual !== undefined ? options.enableVisual : false,
      violationCooldown: options.violationCooldown || 2000,
      ...options
    };
    this.violationTypes = {
      TAB_SWITCH: 'tab_switch',
      FULLSCREEN_EXIT: 'fullscreen_exit',
      COPY_PASTE: 'copy_paste',
      RIGHT_CLICK: 'right_click',
      KEYBOARD_SHORTCUT: 'keyboard_shortcut',
      DEV_TOOLS: 'dev_tools',
      TAB_CLOSE: 'tab_close'
    };

    this.isRunning = false;
    this.lastViolationTime = 0;
    this.violationCount = 0;
    this.mediaStream = null;
    this.videoElement = null;
    this.onViolationCallback = options.onViolation || null;

    // IMPORTANT: bind handlers ONCE and store the bound reference.
    // Previously .bind(this) was called separately at addEventListener time
    // AND at removeEventListener time — those are two different function
    // objects, so removeEventListener never actually removed anything
    // (listener leak, handlers kept piling up on every new exam session).
    this._onVisibilityChange = this.handleVisibilityChange.bind(this);
    this._onFullscreenChange = this.handleFullscreenChange.bind(this);
    this._onWindowBlur = this.handleWindowBlur.bind(this);
    this._onWindowFocus = this.handleWindowFocus.bind(this);
    this._onKeydown = this.handleKeydown.bind(this);
    this._onBeforeUnload = this.handleBeforeUnload.bind(this);
    this._onCopy = this.handleBlockedEvent.bind(this, 'copy');
    this._onPaste = this.handleBlockedEvent.bind(this, 'paste');
    this._onCut = this.handleBlockedEvent.bind(this, 'cut');
    this._onContextMenu = this.handleBlockedEvent.bind(this, 'contextmenu');
    this._onDragStart = this.handleBlockedEvent.bind(this, 'drag');
    this._onDrop = this.handleBlockedEvent.bind(this, 'drop');
  }

  // =============================================
  // INITIALIZE
  // =============================================
  // Pass an already-acquired MediaStream (from the setup screen) so we
  // don't prompt the user for camera/mic permission a second time.
  async initialize(videoElement, existingStream = null) {
    this.videoElement = videoElement;

    try {
      if (existingStream) {
        this.mediaStream = existingStream;
      } else {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: true
        });
      }

      if (this.videoElement) {
        this.videoElement.srcObject = this.mediaStream;
      }

      console.log('📷 Camera & Mic ready for proctoring');
    } catch (error) {
      console.error('Media error:', error);
      throw error;
    }

    this.startMonitoring();
    return this;
  }

  // =============================================
  // MONITORING
  // =============================================
  startMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🛡️ Monitoring started');

    // Tab visibility
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    // Fullscreen
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    document.addEventListener('msfullscreenchange', this._onFullscreenChange);

    // Window blur/focus (these don't bubble through document, need window)
    window.addEventListener('blur', this._onWindowBlur);
    window.addEventListener('focus', this._onWindowFocus);

    // Copy/Paste/Cut/Right-click/Drag — attached to document only.
    // These events bubble up to document, so also attaching them on
    // `window` (as before) fired the handler twice per action.
    document.addEventListener('copy', this._onCopy);
    document.addEventListener('paste', this._onPaste);
    document.addEventListener('cut', this._onCut);
    document.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('dragstart', this._onDragStart);
    document.addEventListener('drop', this._onDrop);

    // Keyboard shortcuts
    document.addEventListener('keydown', this._onKeydown);

    // Tab close warning
    window.addEventListener('beforeunload', this._onBeforeUnload);

    console.log('✅ All event listeners attached');
  }

  // =============================================
  // EVENT HANDLERS
  // =============================================

  handleVisibilityChange() {
    if (document.hidden) {
      this.countViolation(this.violationTypes.TAB_SWITCH, { hidden: true });
    } else {
      this.logViolation('tab_returned', {});
    }
  }

  handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement ||
                         document.webkitFullscreenElement ||
                         document.msFullscreenElement;

    if (!isFullscreen) {
      this.countViolation(this.violationTypes.FULLSCREEN_EXIT, { exited: true });
    }
  }

  handleWindowBlur() {
    this.countViolation(this.violationTypes.TAB_SWITCH, { window_blur: true });
  }

  handleWindowFocus() {
    this.logViolation('window_focused', {});
  }

  handleBlockedEvent(eventType, e) {
    e.preventDefault();
    e.stopPropagation();

    const violationMap = {
      'copy': this.violationTypes.COPY_PASTE,
      'paste': this.violationTypes.COPY_PASTE,
      'cut': this.violationTypes.COPY_PASTE,
      'contextmenu': this.violationTypes.RIGHT_CLICK,
      'drag': this.violationTypes.COPY_PASTE,
      'drop': this.violationTypes.COPY_PASTE
    };

    if (violationMap[eventType]) {
      this.countViolation(violationMap[eventType], { event: eventType });
    }

    return false;
  }

  handleKeydown(e) {
    if (e.ctrlKey || e.metaKey) {
      const blocked = ['c', 'C', 'v', 'V', 'x', 'X', 'a', 'A'];
      if (blocked.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        this.countViolation(this.violationTypes.COPY_PASTE, {
          shortcut: `Ctrl+${e.key}`
        });
        return false;
      }
    }

    if (e.key === 'F12' || e.key === 'PrintScreen' || e.key === 'Insert') {
      e.preventDefault();
      this.countViolation(this.violationTypes.DEV_TOOLS, { key: e.key });
      return false;
    }
  }

  handleBeforeUnload(e) {
    if (this.isRunning) {
      this.logViolation(this.violationTypes.TAB_CLOSE, {});
      e.preventDefault();
      e.returnValue = 'Exam in progress. Are you sure you want to leave?';
      return e.returnValue;
    }
  }

  // =============================================
  // VIOLATION COUNTING
  // =============================================
  countViolation(type, data = {}) {
    const now = Date.now();

    if (now - this.lastViolationTime < this.options.violationCooldown) {
      return;
    }

    this.lastViolationTime = now;
    this.violationCount++;

    const violationData = {
      type,
      count: this.violationCount,
      timestamp: now,
      ...data,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      url: window.location.href
    };

    console.log(`🚨 VIOLATION #${this.violationCount} [${type}]`, violationData);

    // Immediate UI update
    if (this.onViolationCallback) {
      this.onViolationCallback(violationData);
    }

    // Persist to Firebase (fire-and-forget, but logged if it fails)
    if (this.userId) {
      logViolation(this.userId, violationData)
        .then(() => console.log(`✅ Violation saved to Firebase: ${type}`))
        .catch(err => console.error('❌ Firebase save error:', err));
    }
  }

  logViolation(type, data = {}) {
    const violationData = {
      type,
      timestamp: Date.now(),
      ...data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (this.userId) {
      logViolation(this.userId, violationData).catch(err => {
        console.error('❌ Firebase log error:', err);
      });
    }
  }

  // =============================================
  // STOP / CLEANUP
  // =============================================
  stop() {
    this.isRunning = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    document.removeEventListener('msfullscreenchange', this._onFullscreenChange);

    window.removeEventListener('blur', this._onWindowBlur);
    window.removeEventListener('focus', this._onWindowFocus);

    document.removeEventListener('copy', this._onCopy);
    document.removeEventListener('paste', this._onPaste);
    document.removeEventListener('cut', this._onCut);
    document.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('dragstart', this._onDragStart);
    document.removeEventListener('drop', this._onDrop);

    document.removeEventListener('keydown', this._onKeydown);

    window.removeEventListener('beforeunload', this._onBeforeUnload);

    console.log('🛡️ Proctoring stopped. Total violations:', this.violationCount);
  }

  getViolationCount() {
    return this.violationCount;
  }
}

export { ProctoringEngine };
