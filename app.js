/* ============================================
   ECHO — The AI That Understands You
   Core Application Logic
   ============================================ */

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════
const CONFIG = {
  typing: {
    baseSpeed: 35,          // ms per character
    variation: 15,           // random variation ±
    punctuationPause: 250,   // pause on , ; :
    periodPause: 500,        // pause on . ! ?
    lineDelay: 600,          // delay between lines
  },
  phases: {
    transitionDelay: 800,    // delay between phases
  },
  audio: {
    heartbeatBPM: 68,
    droneFrequency: 48,
    masterVolume: 0.15,
  },
};

// ═══════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function getOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
  return 'Unknown';
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ═══════════════════════════════════════
// BEHAVIOR TRACKER
// ═══════════════════════════════════════
class BehaviorTracker {
  constructor() {
    this.mousePositions = [];
    this.totalMouseDistance = 0;
    this.lastMousePos = { x: 0, y: 0 };
    this.mouseSpeed = [];
    this.clickCount = 0;
    this.clickTimestamps = [];
    this.idleTime = 0;
    this.lastActivity = Date.now();
    this.longestIdle = 0;
    this.scrollDistance = 0;
    this.directionChanges = 0;
    this.lastDirection = null;
    this.hesitationCount = 0;
    this.startTime = Date.now();
    this.keypresses = [];
    this.isTracking = false;
    this._mouseMoveThrottled = null;
    this._lastMoveTime = 0;
  }

  start() {
    this.isTracking = true;
    this.startTime = Date.now();

    // Mouse movement tracking (throttled to every 50ms)
    this._onMouseMove = (e) => {
      const now = Date.now();
      if (now - this._lastMoveTime < 50) return;
      this._lastMoveTime = now;

      const pos = { x: e.clientX, y: e.clientY, time: now };
      this.mousePositions.push(pos);

      // Calculate distance
      if (this.lastMousePos.x !== 0 || this.lastMousePos.y !== 0) {
        const dx = pos.x - this.lastMousePos.x;
        const dy = pos.y - this.lastMousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.totalMouseDistance += dist;

        // Track speed
        const timeDiff = now - (this.mousePositions[this.mousePositions.length - 2]?.time || now);
        if (timeDiff > 0) {
          this.mouseSpeed.push(dist / timeDiff);
        }

        // Direction changes (horizontal)
        const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : this.lastDirection;
        if (direction && this.lastDirection && direction !== this.lastDirection) {
          this.directionChanges++;
        }
        this.lastDirection = direction;
      }

      this.lastMousePos = { x: pos.x, y: pos.y };
      this.lastActivity = now;
    };

    // Click tracking
    this._onClick = (e) => {
      this.clickCount++;
      this.clickTimestamps.push(Date.now());
      this.lastActivity = Date.now();
    };

    // Scroll tracking
    this._onScroll = (e) => {
      this.scrollDistance += Math.abs(e.deltaY || 0);
      this.lastActivity = Date.now();
    };

    // Keypress tracking
    this._onKeypress = (e) => {
      this.keypresses.push({ key: e.key, time: Date.now() });
      this.lastActivity = Date.now();
    };

    // Idle time tracking
    this._idleInterval = setInterval(() => {
      const idleMs = Date.now() - this.lastActivity;
      if (idleMs > 2000) {
        this.idleTime += 1;
        if (idleMs > this.longestIdle) {
          this.longestIdle = idleMs;
        }
      }
      // Detect hesitation (pauses of 1-3 seconds after mouse movement)
      if (idleMs > 1000 && idleMs < 3000 && this.mousePositions.length > 5) {
        this.hesitationCount++;
      }
    }, 1000);

    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    document.addEventListener('click', this._onClick, { passive: true });
    document.addEventListener('wheel', this._onScroll, { passive: true });
    document.addEventListener('keydown', this._onKeypress, { passive: true });

    // Touch events for mobile
    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      if (touch) {
        this._onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }, { passive: true });

    document.addEventListener('touchstart', () => {
      this.clickCount++;
      this.clickTimestamps.push(Date.now());
      this.lastActivity = Date.now();
    }, { passive: true });
  }

  stop() {
    this.isTracking = false;
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('wheel', this._onScroll);
    document.removeEventListener('keydown', this._onKeypress);
    clearInterval(this._idleInterval);
  }

  getAnalysis() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const avgSpeed = this.mouseSpeed.length > 0
      ? this.mouseSpeed.reduce((a, b) => a + b, 0) / this.mouseSpeed.length
      : 0;
    const clickRate = elapsed > 0 ? this.clickCount / elapsed : 0;

    return {
      totalDistance: Math.round(this.totalMouseDistance),
      averageSpeed: avgSpeed.toFixed(2),
      clickCount: this.clickCount,
      clickRate: clickRate.toFixed(3),
      idleSeconds: this.idleTime,
      longestIdleMs: this.longestIdle,
      directionChanges: this.directionChanges,
      hesitationCount: this.hesitationCount,
      elapsed: Math.round(elapsed),
      scrollDistance: Math.round(this.scrollDistance),
      mousePositionCount: this.mousePositions.length,
    };
  }

  // Generate personality insights based on tracked data
  getInsights() {
    const analysis = this.getAnalysis();
    const insights = [];

    // Mouse behavior insights
    if (analysis.averageSpeed > 1.2) {
      insights.push("You move quickly. Restless. Like you're searching for something.");
    } else if (analysis.averageSpeed > 0.5) {
      insights.push("Your movements are measured. Deliberate. You think before you act.");
    } else {
      insights.push("You're careful. Almost cautious. You observe before you engage.");
    }

    // Click behavior
    if (analysis.clickCount > 8) {
      insights.push("You click often. Seeking control. Testing boundaries.");
    } else if (analysis.clickCount > 3) {
      insights.push("Selective interaction. You don't act without reason.");
    } else {
      insights.push("Minimal interaction. You prefer to watch rather than touch.");
    }

    // Hesitation
    if (analysis.hesitationCount > 5) {
      insights.push("You hesitate before acting. Not from fear — from overthinking.");
    } else if (analysis.directionChanges > 20) {
      insights.push("Your mind changes direction often. Creative, but scattered.");
    }

    // Idle behavior
    if (analysis.idleSeconds > 5) {
      insights.push("You're patient. Or distracted. The line between them is thin.");
    } else {
      insights.push("You're slightly impatient. You need things to keep moving.");
    }

    return insights;
  }

  // Determine personality archetype
  getArchetype() {
    const analysis = this.getAnalysis();
    const speed = parseFloat(analysis.averageSpeed);
    const clicks = analysis.clickCount;
    const idle = analysis.idleSeconds;
    const hesitation = analysis.hesitationCount;

    // Score dimensions
    const patience = Math.min(10, idle * 1.5 + (hesitation > 3 ? 2 : 0));
    const decisiveness = Math.min(10, clicks * 0.8 + (speed > 1 ? 3 : 0));
    const curiosity = Math.min(10, analysis.directionChanges * 0.3 + clicks * 0.5);
    const control = Math.min(10, (analysis.scrollDistance > 100 ? 3 : 0) + clicks * 0.6 + (speed < 0.8 ? 3 : 0));

    if (patience > 6 && decisiveness < 4) {
      return {
        name: "The Observer",
        description: "You see what others miss. You process before you react. People mistake your silence for absence — but you're the most present person in any room. You don't need to speak to understand. You already know.",
        traits: ["Patient", "Perceptive", "Guarded"],
        color: "#00e5ff"
      };
    } else if (curiosity > 6 && idle < 3) {
      return {
        name: "The Seeker",
        description: "You're driven by the need to understand. Not content with surfaces, you dig deeper than most people are comfortable with. Your mind never stops moving — and neither do you. Rest feels like wasted potential.",
        traits: ["Curious", "Restless", "Driven"],
        color: "#ff9500"
      };
    } else if (decisiveness > 6 && speed > 0.8) {
      return {
        name: "The Architect",
        description: "You don't just react — you design outcomes. Every action is a calculation, every pause is strategic. People think you're impulsive; you've simply already finished thinking before they've started.",
        traits: ["Strategic", "Decisive", "Controlled"],
        color: "#30d158"
      };
    } else {
      return {
        name: "The Mirror",
        description: "You absorb the energy of everything around you. You adapt, reflect, transform. People see themselves in you, which is both your gift and your burden. You feel more deeply than you let anyone know.",
        traits: ["Adaptive", "Empathetic", "Complex"],
        color: "#ff2d55"
      };
    }
  }
}

// ═══════════════════════════════════════
// AUDIO ENGINE (Web Audio API)
// ═══════════════════════════════════════
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.heartbeatInterval = null;
    this.droneOsc = null;
    this.isPlaying = false;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = CONFIG.audio.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch (e) {
      console.warn('Audio not available:', e);
      return false;
    }
  }

  // Low ambient drone
  startDrone() {
    if (!this.ctx) return;
    try {
      this.droneOsc = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      this.droneOsc.type = 'sine';
      this.droneOsc.frequency.value = CONFIG.audio.droneFrequency;
      droneGain.gain.value = 0;
      this.droneOsc.connect(droneGain);
      droneGain.connect(this.masterGain);
      this.droneOsc.start();
      // Fade in slowly
      droneGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 3);
      this._droneGain = droneGain;
    } catch (e) {
      console.warn('Drone failed:', e);
    }
  }

  stopDrone() {
    if (this.droneOsc) {
      try {
        this._droneGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        setTimeout(() => {
          this.droneOsc.stop();
          this.droneOsc = null;
        }, 2500);
      } catch (e) {}
    }
  }

  // Heartbeat effect — two-part "lub-dub"
  startHeartbeat() {
    if (!this.ctx) return;
    const beatInterval = 60000 / CONFIG.audio.heartbeatBPM;

    const playBeat = () => {
      const now = this.ctx.currentTime;

      // "Lub" - first beat
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 55;
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.06);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // "Dub" - second beat (slightly higher, slightly delayed)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 45;
      gain2.gain.setValueAtTime(0, now + 0.18);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.24);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.5);
    };

    playBeat();
    this.heartbeatInterval = setInterval(playBeat, beatInterval);
    this.isPlaying = true;
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.isPlaying = false;
    }
  }

  // Glitch sound - burst of noise with filter sweep
  playGlitch(duration = 600) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * (duration / 1000);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(4000, now + duration / 2000);
    filter.frequency.linearRampToValueAtTime(200, now + duration / 1000);
    filter.Q.value = 5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + duration / 1000);
  }

  // Low impact sound for reveals
  playReveal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Tension builder — rising tone
  playTension(duration = 3000) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + duration / 1000);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + duration / 2000);
    gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration / 1000 + 0.1);
  }

  destroy() {
    this.stopHeartbeat();
    this.stopDrone();
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

// ═══════════════════════════════════════
// EFFECTS ENGINE
// ═══════════════════════════════════════
class EffectsEngine {
  constructor() {
    this.terminal = document.getElementById('terminal');
    this.flickerOverlay = document.getElementById('flicker-overlay');
    this.glitchOverlay = document.getElementById('glitch-overlay');
  }

  // Type text character by character with realistic timing
  async typeText(element, text, options = {}) {
    const {
      speed = CONFIG.typing.baseSpeed,
      variation = CONFIG.typing.variation,
      showCursor = true,
    } = options;

    element.textContent = '';
    if (showCursor) {
      const cursor = document.createElement('span');
      cursor.className = 'cursor-blink';
      element.appendChild(cursor);
      element.classList.add('typing');
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Insert character before cursor
      const cursorEl = element.querySelector('.cursor-blink');
      if (cursorEl) {
        element.insertBefore(document.createTextNode(char), cursorEl);
      } else {
        element.textContent += char;
      }

      // Calculate delay based on character
      let delay = speed + randomBetween(-variation, variation);
      if (',;:'.includes(char)) delay += CONFIG.typing.punctuationPause;
      if ('.!?'.includes(char)) delay += CONFIG.typing.periodPause;
      if (char === '\n') delay += 200;

      await sleep(Math.max(10, delay));
    }

    // Remove cursor after typing completes
    if (!options.keepCursor) {
      const cursor = element.querySelector('.cursor-blink');
      if (cursor) {
        await sleep(300);
        cursor.remove();
      }
    }
    element.classList.remove('typing');
  }

  // Add a new line to the terminal with typing animation
  async addLine(text, options = {}) {
    const {
      className = '',
      type = true,
      delay = CONFIG.typing.lineDelay,
      keepCursor = false,
      speed,
    } = options;

    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    this.terminal.appendChild(line);

    // Trigger visibility animation
    requestAnimationFrame(() => {
      line.classList.add('visible');
    });

    // Auto-scroll to bottom
    this.terminal.scrollTop = this.terminal.scrollHeight;

    if (type) {
      await this.typeText(line, text, { keepCursor, speed });
    } else {
      line.textContent = text;
    }

    await sleep(delay);
    return line;
  }

  // Add a separator line
  async addSeparator() {
    const sep = document.createElement('div');
    sep.className = 'terminal-separator';
    this.terminal.appendChild(sep);
    requestAnimationFrame(() => sep.classList.add('visible'));
    await sleep(400);
  }

  // Add a progress bar
  async addProgressBar(label, duration = 2000) {
    const container = document.createElement('div');
    container.className = 'progress-container';
    container.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-label">${label}</div>
    `;
    this.terminal.appendChild(container);
    requestAnimationFrame(() => container.classList.add('visible'));

    const fill = container.querySelector('.progress-fill');
    const startTime = Date.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        fill.style.width = progress + '%';

        if (progress < 100) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  // Clear terminal content
  async clearTerminal(fadeOut = true) {
    if (fadeOut) {
      const lines = this.terminal.querySelectorAll('.terminal-line, .terminal-separator, .progress-container');
      lines.forEach(line => {
        line.style.transition = 'opacity 0.4s ease';
        line.style.opacity = '0';
      });
      await sleep(500);
    }
    this.terminal.innerHTML = '';
  }

  // Trigger screen flicker
  triggerFlicker() {
    this.flickerOverlay.classList.add('active');
    setTimeout(() => this.flickerOverlay.classList.remove('active'), 200);
  }

  // Trigger glitch overlay
  triggerGlitch(duration = 2000) {
    this.glitchOverlay.classList.add('active');
    document.getElementById('experience').classList.add('screen-shake');
    setTimeout(() => {
      this.glitchOverlay.classList.remove('active');
      document.getElementById('experience').classList.remove('screen-shake');
    }, duration);
  }

  // Text scramble effect on an element
  async scrambleText(element, finalText, duration = 1000) {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const startTime = Date.now();

    return new Promise(resolve => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);

        let result = '';
        for (let i = 0; i < finalText.length; i++) {
          if (i < finalText.length * progress) {
            result += finalText[i];
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        element.textContent = result;

        if (progress >= 1) {
          clearInterval(interval);
          element.textContent = finalText;
          resolve();
        }
      }, 40);
    });
  }
}

// ═══════════════════════════════════════
// CUSTOM CURSOR
// ═══════════════════════════════════════
class CustomCursor {
  constructor() {
    this.cursor = document.getElementById('custom-cursor');
    this.dot = document.getElementById('custom-cursor-dot');
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isActive = false;
  }

  start() {
    if (getDeviceType() !== 'desktop') return;

    this.isActive = true;
    this.cursor.classList.add('visible');
    this.dot.classList.add('visible');

    document.addEventListener('mousemove', (e) => {
      this.targetX = e.clientX;
      this.targetY = e.clientY;
      // Dot follows immediately
      this.dot.style.left = e.clientX + 'px';
      this.dot.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
      this.cursor.classList.add('clicking');
    });

    document.addEventListener('mouseup', () => {
      this.cursor.classList.remove('clicking');
    });

    // Circle follows with lag
    const animate = () => {
      if (!this.isActive) return;
      this.currentX = lerp(this.currentX, this.targetX, 0.12);
      this.currentY = lerp(this.currentY, this.targetY, 0.12);
      this.cursor.style.left = this.currentX + 'px';
      this.cursor.style.top = this.currentY + 'px';
      requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    this.isActive = false;
    this.cursor.classList.remove('visible');
    this.dot.classList.remove('visible');
  }
}

// ═══════════════════════════════════════
// LOCAL STORAGE MANAGER (Memory Illusion)
// ═══════════════════════════════════════
class MemoryManager {
  constructor() {
    this.key = 'echo_memory';
  }

  load() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  save(data) {
    try {
      const existing = this.load() || {};
      const updated = {
        ...existing,
        ...data,
        visitCount: (existing.visitCount || 0) + 1,
        lastVisit: Date.now(),
        firstVisit: existing.firstVisit || Date.now(),
      };
      localStorage.setItem(this.key, JSON.stringify(updated));
    } catch (e) {}
  }

  isReturning() {
    const data = this.load();
    return data && data.visitCount > 0;
  }

  getVisitCount() {
    const data = this.load();
    return data ? (data.visitCount || 0) : 0;
  }

  getLastVisit() {
    const data = this.load();
    return data ? data.lastVisit : null;
  }

  getPreviousArchetype() {
    const data = this.load();
    return data ? data.archetype : null;
  }
}

// ═══════════════════════════════════════
// ANALYSIS COUNTER (UI element)
// ═══════════════════════════════════════
class AnalysisCounter {
  constructor() {
    this.element = document.getElementById('analysis-counter');
    this.valueEl = this.element.querySelector('.counter-value');
    this.value = 0;
    this.interval = null;
  }

  start() {
    this.element.classList.add('visible');
    this.interval = setInterval(() => {
      this.value += randomBetween(0.1, 0.8);
      if (this.value > 100) this.value = 100;
      this.valueEl.textContent = this.value.toFixed(1) + '%';
    }, 200);
  }

  setTo(val) {
    this.value = val;
    this.valueEl.textContent = val.toFixed(1) + '%';
  }

  stop() {
    clearInterval(this.interval);
  }

  hide() {
    this.stop();
    this.element.classList.remove('visible');
  }
}

// ═══════════════════════════════════════
// MAIN APPLICATION — PHASE ORCHESTRATOR
// ═══════════════════════════════════════
class EchoApp {
  constructor() {
    this.tracker = new BehaviorTracker();
    this.audio = new AudioEngine();
    this.effects = new EffectsEngine();
    this.cursor = new CustomCursor();
    this.memory = new MemoryManager();
    this.counter = new AnalysisCounter();

    this.landing = document.getElementById('landing');
    this.experience = document.getElementById('experience');
    this.result = document.getElementById('result');
    this.echoLogo = document.getElementById('echo-logo');

    this.isRunning = false;
    this.mouseMovedDuringPrediction = false;
  }

  init() {
    // Set up landing page
    this.setupLanding();
    // Start custom cursor
    this.cursor.start();
    // Check for returning user
    this.checkReturningUser();
  }

  checkReturningUser() {
    if (this.memory.isReturning()) {
      const lastVisit = this.memory.getLastVisit();
      const banner = document.createElement('div');
      banner.className = 'returning-banner';
      banner.textContent = `You were here ${getRelativeTime(lastVisit)}. I remember you.`;
      this.landing.insertBefore(banner, this.landing.firstChild.nextSibling);
    }
  }

  setupLanding() {
    const ctaBtn = document.getElementById('cta-button');
    ctaBtn.addEventListener('click', () => this.startExperience());
  }

  async startExperience() {
    // Initialize audio on user interaction
    this.audio.init();

    // Request fullscreen (optional, may be blocked)
    try {
      await document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {}

    // Transition from landing to experience
    this.landing.classList.add('hidden');
    await sleep(800);

    // Show experience
    this.experience.classList.add('active');
    this.echoLogo.classList.add('visible');

    // Start tracking behavior
    this.tracker.start();

    // Start audio
    this.audio.startDrone();
    await sleep(1500);
    this.audio.startHeartbeat();

    // Mark as running
    this.isRunning = true;

    // Run phases sequentially
    await this.phase1_initialization();
    await this.phase2_trustBuilding();
    await this.phase3_curiosityHook();
    await this.phase4_behavioralAnalysis();
    await this.phase5_psychologicalImpact();
    await this.phase6_systemBreakdown();
    await this.phase7_loopIllusion();
    await this.phase8_predictionIllusion();
    await this.phase9_finalTwist();
    await this.showResult();
  }

  // ─── PHASE 1: INITIALIZATION ───
  async phase1_initialization() {
    this.counter.start();

    await this.effects.addLine('> ECHO v2.7.1', { className: 'dim', speed: 20, delay: 300 });
    await this.effects.addLine('> Initializing neural pattern recognition...', { className: 'dim', speed: 15, delay: 200 });
    await this.effects.addProgressBar('LOADING BEHAVIORAL ENGINE', 1500);
    await sleep(300);
    await this.effects.addLine('> Accessing device...', { className: 'dim', speed: 20, delay: 400 });
    await this.effects.addLine('> Reading patterns...', { className: 'dim', speed: 20, delay: 400 });
    await this.effects.addLine('> Connection established.', { className: 'accent', speed: 20, delay: 600 });
    await sleep(500);

    this.effects.triggerFlicker();
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 2: ESTABLISH TRUST (REAL DATA) ───
  async phase2_trustBuilding() {
    const timeOfDay = getTimeOfDay();
    const device = getDeviceType();
    const browser = getBrowserName();
    const os = getOS();
    const hour = new Date().getHours();
    const minutes = new Date().getMinutes();

    // Time-aware greeting
    let timeStatement;
    if (timeOfDay === 'night') {
      timeStatement = "It's late. Most people wouldn't be here at this hour.";
    } else if (timeOfDay === 'morning') {
      timeStatement = "Early. You started your day and came here. Interesting.";
    } else if (timeOfDay === 'evening') {
      timeStatement = "Evening. The time when people let their guard down.";
    } else {
      timeStatement = "Middle of the day. A break from something, or avoiding something?";
    }

    await this.effects.addLine(`${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} — ${timeStatement}`, { className: '', delay: 800 });

    await this.effects.addLine(`${os}. ${browser}. ${device === 'desktop' ? 'Desktop' : device === 'mobile' ? 'Mobile' : 'Tablet'}.`, { className: 'dim', delay: 400 });

    // Screen resolution
    await this.effects.addLine(`${window.screen.width}×${window.screen.height} pixels. I can see your screen.`, { className: 'dim', delay: 600 });

    this.audio.playReveal();

    // Language detection
    const lang = navigator.language || 'en';
    await this.effects.addLine(`Language: ${lang}. Timezone offset: UTC${new Date().getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(new Date().getTimezoneOffset() / 60)}.`, { className: 'dim', delay: 600 });

    await sleep(400);
    await this.effects.addLine("This isn't a guess. This is what you brought with you.", { className: 'accent', delay: 1000 });

    await sleep(500);
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 3: CURIOSITY & HOOK ───
  async phase3_curiosityHook() {
    await this.effects.addLine("You didn't come here randomly.", { className: 'large', delay: 1200 });
    await sleep(400);
    await this.effects.addLine("Something led you here. A link. A message. Curiosity.", { className: '', delay: 1000 });
    await sleep(300);
    await this.effects.addLine("You were doing something else before this.", { className: '', delay: 1200 });
    await sleep(500);

    // Check referrer
    const referrer = document.referrer;
    if (referrer) {
      try {
        const refDomain = new URL(referrer).hostname;
        await this.effects.addLine(`You came from ${refDomain}.`, { className: 'accent', delay: 800 });
      } catch(e) {}
    }

    await this.effects.addLine("And you'll go back to it after this. But not yet.", { className: 'dim', delay: 1000 });

    await sleep(600);
    this.effects.triggerFlicker();
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 4: BEHAVIORAL ANALYSIS ───
  async phase4_behavioralAnalysis() {
    await this.effects.addLine("Now I'm watching.", { className: 'large', delay: 800 });
    await sleep(300);
    await this.effects.addSeparator();

    const analysis = this.tracker.getAnalysis();

    // Real-time data reveal
    await this.effects.addLine(`Mouse distance: ${analysis.totalDistance.toLocaleString()} pixels`, { className: 'dim', speed: 20, delay: 300 });
    await this.effects.addLine(`Interactions: ${analysis.clickCount} clicks`, { className: 'dim', speed: 20, delay: 300 });
    await this.effects.addLine(`Average speed: ${analysis.averageSpeed} px/ms`, { className: 'dim', speed: 20, delay: 300 });
    await this.effects.addLine(`Time elapsed: ${analysis.elapsed}s`, { className: 'dim', speed: 20, delay: 300 });

    await this.effects.addSeparator();
    await sleep(500);

    // Adaptive insights
    const insights = this.tracker.getInsights();
    for (const insight of insights) {
      this.audio.playReveal();
      await this.effects.addLine(insight, { className: '', delay: 1200 });
    }

    await sleep(800);
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 5: PSYCHOLOGICAL IMPACT ───
  async phase5_psychologicalImpact() {
    await sleep(800);

    // Barnum statements that feel personal
    await this.effects.addLine("You're harder on yourself than anyone around you.", { className: 'large', delay: 1500 });
    await sleep(600);
    await this.effects.addLine("You replay conversations in your head. Wondering if you said the right thing.", { delay: 1200 });
    await sleep(400);
    await this.effects.addLine("Not always. But more often than you'd admit.", { className: 'dim', delay: 1000 });

    await sleep(1500);

    // The KILLER line
    this.audio.playTension(2000);
    await sleep(2000);
    await this.effects.addLine("You're avoiding something important right now.", { className: 'large danger', delay: 2000 });

    await sleep(2500);
    this.effects.triggerFlicker();
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 6: SYSTEM BREAKDOWN ───
  async phase6_systemBreakdown() {
    await sleep(500);

    await this.effects.addLine("Wait.", { className: 'large', delay: 1500 });
    await sleep(1200);

    // Glitch effect
    this.audio.playGlitch(800);
    this.effects.triggerGlitch(1500);
    this.effects.triggerFlicker();

    await sleep(800);

    const line = await this.effects.addLine("████████████████████", { className: 'danger', delay: 400 });
    await sleep(300);
    await this.effects.scrambleText(line, "This isn't analysis.", 600);

    await sleep(1000);

    this.audio.playGlitch(400);
    this.effects.triggerFlicker();

    await this.effects.addLine("Something is wrong.", { className: 'danger', delay: 1500 });

    await sleep(1500);
    this.effects.triggerFlicker();
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 7: LOOP ILLUSION ───
  async phase7_loopIllusion() {
    await this.effects.addLine("Let me show you what I saw.", { className: 'large', delay: 1200 });
    await sleep(600);
    await this.effects.addSeparator();

    const analysis = this.tracker.getAnalysis();

    // Replay user actions as a log
    await this.effects.addLine(`[LOG] 00:00 — Session initiated`, { className: 'dim', speed: 15, delay: 200 });
    await this.effects.addLine(`[LOG] 00:01 — Mouse movement detected — ${analysis.totalDistance.toLocaleString()}px traversed`, { className: 'dim', speed: 15, delay: 200 });
    await this.effects.addLine(`[LOG] 00:${String(Math.min(analysis.elapsed, 99)).padStart(2, '0')} — ${analysis.clickCount} interaction events captured`, { className: 'dim', speed: 15, delay: 200 });
    await this.effects.addLine(`[LOG] 00:${String(Math.min(analysis.elapsed, 99)).padStart(2, '0')} — ${analysis.directionChanges} directional changes logged`, { className: 'dim', speed: 15, delay: 200 });

    if (analysis.hesitationCount > 0) {
      await this.effects.addLine(`[LOG] — ${analysis.hesitationCount} hesitation events detected`, { className: 'dim', speed: 15, delay: 200 });
    }

    await this.effects.addSeparator();
    await sleep(800);

    this.audio.playReveal();
    await this.effects.addLine("I didn't react to you.", { className: 'large', delay: 1500 });
    await sleep(800);
    await this.effects.addLine("I already knew this would happen.", { className: 'accent', delay: 1500 });

    await sleep(1000);
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 8: PREDICTION ILLUSION ───
  async phase8_predictionIllusion() {
    await sleep(500);
    await this.effects.addLine("One more thing.", { className: 'large', delay: 1000 });
    await sleep(800);

    // The prediction trick — almost everyone moves their mouse reactively
    this.mouseMovedDuringPrediction = false;
    const moveListener = () => { this.mouseMovedDuringPrediction = true; };
    document.addEventListener('mousemove', moveListener);
    document.addEventListener('touchmove', moveListener);

    await this.effects.addLine("In 3 seconds, you'll move your mouse.", { className: 'accent', delay: 500 });

    // Countdown
    const countdown = await this.effects.addLine("3", { className: 'large center', delay: 0 });
    await sleep(1000);
    countdown.textContent = "2";
    await sleep(1000);
    countdown.textContent = "1";
    await sleep(1000);
    countdown.textContent = "";

    document.removeEventListener('mousemove', moveListener);
    document.removeEventListener('touchmove', moveListener);

    await sleep(500);

    if (this.mouseMovedDuringPrediction) {
      this.audio.playReveal();
      await this.effects.addLine("There it is.", { className: 'large accent', delay: 1500 });
    } else {
      await this.effects.addLine("Interesting. You resisted.", { className: 'large', delay: 1200 });
      await sleep(400);
      await this.effects.addLine("That tells me even more about you.", { className: 'dim', delay: 1000 });
    }

    await sleep(1200);
    this.effects.triggerFlicker();
    await this.effects.clearTerminal();
    await sleep(CONFIG.phases.transitionDelay);
  }

  // ─── PHASE 9: FINAL TWIST ───
  async phase9_finalTwist() {
    this.audio.stopHeartbeat();
    this.counter.hide();

    // Silence for dramatic effect
    await sleep(2000);

    await this.effects.addLine("You're not being analyzed.", { className: 'huge center', delay: 2000 });

    await sleep(2000);

    // Final glitch
    this.audio.playGlitch(1200);
    this.effects.triggerGlitch(2500);
    this.effects.triggerFlicker();

    await sleep(1500);

    await this.effects.addLine("You're being repeated.", { className: 'huge center danger', delay: 3000 });

    await sleep(3000);

    // Let it sink in
    await this.effects.addLine("Every reaction you had — someone else had the exact same one.", { className: 'dim center', delay: 1500 });
    await sleep(800);
    await this.effects.addLine("The same hesitation. The same curiosity. The same fear.", { className: 'dim center', delay: 1500 });
    await sleep(800);
    await this.effects.addLine("You are not unique here. You are a pattern.", { className: 'center', delay: 2000 });

    await sleep(3000);

    // Stop everything
    this.audio.stopDrone();
    this.tracker.stop();

    await this.effects.clearTerminal();
    await sleep(1500);
  }

  // ─── RESULT SCREEN ───
  async showResult() {
    this.experience.classList.remove('active');
    this.echoLogo.classList.remove('visible');

    const archetype = this.tracker.getArchetype();
    const analysis = this.tracker.getAnalysis();

    // Save to memory for returning visits
    this.memory.save({
      archetype: archetype.name,
      analysis: analysis,
    });

    // Build result card
    const resultCard = this.result.querySelector('.result-card');
    resultCard.querySelector('.result-type').textContent = archetype.name;
    resultCard.querySelector('.result-type').style.background = `linear-gradient(135deg, #ffffff 0%, ${archetype.color} 100%)`;
    resultCard.querySelector('.result-type').style.setProperty('-webkit-background-clip', 'text');
    resultCard.querySelector('.result-type').style.setProperty('background-clip', 'text');
    resultCard.querySelector('.result-description').textContent = archetype.description;

    // Traits
    const traitsEl = resultCard.querySelector('.result-traits');
    if (traitsEl) {
      traitsEl.innerHTML = archetype.traits.map(t => `<span class="trait">${t}</span>`).join('');
    }

    // Stats
    const statValues = resultCard.querySelectorAll('.result-stat-value');
    if (statValues[0]) statValues[0].textContent = analysis.totalDistance.toLocaleString();
    if (statValues[1]) statValues[1].textContent = analysis.clickCount;
    if (statValues[2]) statValues[2].textContent = analysis.elapsed + 's';

    // Show result
    this.result.classList.add('active');

    // Set up share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareResult(archetype));
    }

    // Set up retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  async shareResult(archetype) {
    const text = `ECHO identified me as "${archetype.name}" — ${archetype.traits.join(', ')}. This AI experience is unsettling. Try it yourself.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ECHO — The AI That Understands You',
          text: text,
          url: window.location.href,
        });
      } catch (e) {
        this.copyToClipboard(text);
      }
    } else {
      this.copyToClipboard(text);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const shareBtn = document.getElementById('share-btn');
      const originalText = shareBtn.textContent;
      shareBtn.textContent = 'COPIED';
      setTimeout(() => { shareBtn.textContent = originalText; }, 2000);
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }
}

// ═══════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const app = new EchoApp();
  app.init();

  // Easter egg: Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && app.isRunning) {
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-family: var(--font-mono); font-size: 1.2rem; color: #ff2d55;
        z-index: 20000; opacity: 0; transition: opacity 0.3s ease;
        text-align: center; letter-spacing: 2px;
      `;
      warning.textContent = "You can't leave yet.";
      document.body.appendChild(warning);
      requestAnimationFrame(() => warning.style.opacity = '1');
      setTimeout(() => {
        warning.style.opacity = '0';
        setTimeout(() => warning.remove(), 400);
      }, 1500);
    }
  });
});
