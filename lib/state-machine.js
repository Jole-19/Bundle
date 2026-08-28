/**
 * Bundle — State Machine
 * Maps real extension events to the 9 mascot SVG animations.
 * Each state maps directly to an SVG file in assets/mascot/animations/.
 */

const MASCOT_STATES = {
  IDLE: 'idle',
  ATTENTIVE: 'attentive',
  THINKING: 'thinking',
  EXCITED: 'excited',
  TYPING_WINK: 'typing-wink',
  ERROR_ALERT: 'error-alert',
  SLEEPY: 'sleepy',
  SAD: 'sad',
  CURIOUS: 'curious',
};

// State → label mapping
const STATE_LABELS = {
  idle: 'Ready to go!',
  attentive: 'Ohh whats that!',
  thinking: 'Opening tabs…',
  excited: 'All set!',
  'typing-wink': 'I\'m listening…',
  'error-alert': 'Something went wrong!',
  sleepy: 'Zzz… add a collection',
  sad: 'Goodbye, collection…',
  curious: 'Hey there!',
};

class BundleStateMachine {
  constructor(mascotEl, labelEl, formMascotEl = null) {
    this.mascotEl = mascotEl;
    this.labelEl = labelEl;
    this.formMascotEl = formMascotEl;
    this.currentState = null;
    this.timeoutId = null;
    this.hoverTimeoutId = null;
    this.basePath = '../assets/mascot/animations/';
  }

  transition(state, duration = null) {
    if (state === this.currentState) return;
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.currentState = state;

    // Swap the SVG source — forces a fresh animation start
    const newSrc = this.basePath + state + '.svg';
    if (this.mascotEl) this.mascotEl.setAttribute('data', newSrc);
    if (this.formMascotEl) this.formMascotEl.setAttribute('data', newSrc);

    // Bounce effect on transition
    if (this.mascotEl) {
      this.mascotEl.classList.remove('bounce');
      void this.mascotEl.offsetWidth; // force reflow
      this.mascotEl.classList.add('bounce');
    }
    if (this.formMascotEl) {
      this.formMascotEl.classList.remove('bounce');
      void this.formMascotEl.offsetWidth;
      this.formMascotEl.classList.add('bounce');
    }

    // Update label
    if (this.labelEl) {
      this.labelEl.textContent = STATE_LABELS[state] || '';
    }

    // Auto-return to idle after duration
    if (duration) {
      this.timeoutId = setTimeout(() => {
        this.transition(MASCOT_STATES.IDLE);
      }, duration);
    }
  }

  // ─── Event handlers ─────────────────────────────────────────────
  onPopupOpen(hasCollections) {
    this.transition(hasCollections ? MASCOT_STATES.IDLE : MASCOT_STATES.SLEEPY);
  }

  onCollectionHover() {
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = null;
    }
    if (this.currentState === MASCOT_STATES.IDLE || this.currentState === MASCOT_STATES.SLEEPY || !this.currentState) {
      this.transition(MASCOT_STATES.ATTENTIVE);
    }
  }

  onCollectionHoverEnd() {
    if (this.hoverTimeoutId) clearTimeout(this.hoverTimeoutId);
    this.hoverTimeoutId = setTimeout(() => {
      if (this.currentState === MASCOT_STATES.ATTENTIVE) {
        this.transition(MASCOT_STATES.IDLE);
      }
    }, 300);
  }

  onCollectionClick() {
    this.transition(MASCOT_STATES.THINKING);
  }

  onTabsOpened() {
    this.transition(MASCOT_STATES.EXCITED, 2500);
  }

  onTabsError() {
    this.transition(MASCOT_STATES.ERROR_ALERT, 2500);
  }

  onFormOpen() {
    if (this.hoverTimeoutId) clearTimeout(this.hoverTimeoutId);
    this.stopFormLoop();

    this.isFormOpen = true;
    this.transition(MASCOT_STATES.CURIOUS);
    this.scheduleNextFormLoop(3500);
  }

  scheduleNextFormLoop(delay = 3500) {
    if (!this.isFormOpen) return;
    if (this.formCycleTimeout) clearTimeout(this.formCycleTimeout);

    this.formCycleTimeout = setTimeout(() => {
      if (!this.isFormOpen) return;

      // Do not interrupt while user is actively focused on input fields
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.id === 'input-name' || activeEl.id === 'input-urls');
      if (isInputActive) {
        this.scheduleNextFormLoop(3500);
        return;
      }

      this.stepFormLoop();
    }, delay);
  }

  stepFormLoop() {
    if (!this.isFormOpen) return;

    const formStatesPool = [
      MASCOT_STATES.CURIOUS,
      MASCOT_STATES.THINKING,
      MASCOT_STATES.IDLE,
      MASCOT_STATES.ATTENTIVE
    ];

    // Filter out current state to ensure a smooth transition on every step
    const availableStates = formStatesPool.filter(s => s !== this.currentState);
    const nextState = availableStates[Math.floor(Math.random() * availableStates.length)];

    this.transition(nextState);

    // Randomize next iteration interval between 3.8s and 5.5s
    const nextDelay = Math.floor(Math.random() * 1700) + 3800;
    this.scheduleNextFormLoop(nextDelay);
  }

  stopFormLoop() {
    this.isFormOpen = false;
    if (this.formCycleTimeout) {
      clearTimeout(this.formCycleTimeout);
      this.formCycleTimeout = null;
    }
  }

  onUserTyping() {
    this.transition(MASCOT_STATES.EXCITED);
  }

  onUserStoppedTyping() {
    if (this.isFormOpen) {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.id === 'input-name' || activeEl.id === 'input-urls');
      if (!isInputActive) {
        this.stepFormLoop();
      } else {
        this.scheduleNextFormLoop(3000);
      }
    } else {
      this.transition(MASCOT_STATES.IDLE);
    }
  }

  onCollectionDeleted() {
    this.transition(MASCOT_STATES.SAD, 1500);
  }
}

window.MASCOT_STATES = MASCOT_STATES;
window.BundleStateMachine = BundleStateMachine;
