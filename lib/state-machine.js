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
  attentive: 'Ooh, what\'s this?',
  thinking: 'Opening tabs…',
  excited: 'All set! 🎉',
  'typing-wink': 'I\'m listening…',
  'error-alert': 'Something went wrong!',
  sleepy: 'Zzz… add a collection',
  sad: 'Goodbye, collection…',
  curious: 'Hey there! 👀',
};

class BundleStateMachine {
  constructor(mascotEl, labelEl) {
    this.mascotEl = mascotEl;
    this.labelEl = labelEl;
    this.currentState = null;
    this.timeoutId = null;
    this.basePath = '../assets/mascot/animations/';
  }

  transition(state, duration = null) {
    if (state === this.currentState) return;
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.currentState = state;

    // Swap the SVG source — forces a fresh animation start
    const newSrc = this.basePath + state + '.svg';
    this.mascotEl.setAttribute('data', newSrc);

    // Bounce effect on transition
    this.mascotEl.classList.remove('bounce');
    void this.mascotEl.offsetWidth; // force reflow
    this.mascotEl.classList.add('bounce');

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
    this.transition(MASCOT_STATES.ATTENTIVE);
  }

  onCollectionHoverEnd() {
    this.transition(MASCOT_STATES.IDLE);
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

  onUserTyping() {
    this.transition(MASCOT_STATES.TYPING_WINK);
  }

  onUserStoppedTyping() {
    this.transition(MASCOT_STATES.IDLE);
  }

  onCollectionDeleted() {
    this.transition(MASCOT_STATES.SAD, 1500);
  }
}

window.MASCOT_STATES = MASCOT_STATES;
window.BundleStateMachine = BundleStateMachine;
