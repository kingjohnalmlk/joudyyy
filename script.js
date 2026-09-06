// ===== Floating Balloons (reusable spawner) =====
const balloonColors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#5f27cd', '#f368e0', '#ffd32a', '#1dd1a1'];

function spawnBalloon() {
  const balloonBox = document.getElementById('balloons');
  const b = document.createElement('div');
  b.className = 'balloon';
  const size = 30 + Math.random() * 50;
  b.style.width = size + 'px';
  b.style.height = (size * 1.3) + 'px';
  b.style.left = Math.random() * 100 + 'vw';
  b.style.background = balloonColors[Math.floor(Math.random() * balloonColors.length)];
  b.style.animationDuration = (10 + Math.random() * 15) + 's';
  b.style.animationDelay = (Math.random() * 10) + 's';
  balloonBox.appendChild(b);
  return b;
}

// spawn the initial batch
(function () {
  for (let i = 0; i < 18; i++) {
    spawnBalloon();
  }
})();

// ===== Audio =====
let introAudio = null;

function startAudio() {
  if (introAudio) return;
  introAudio = new Audio('intro.mp3');
  introAudio.loop = true;
  introAudio.play().catch(() => {});
}

// pop burst sound using Web Audio (no external files)
let popCtx = null;
function playPopSound() {
  try {
    popCtx = popCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (popCtx.state === 'suspended') popCtx.resume();
    const t = popCtx.currentTime;

    // sharp "pop" click
    const osc = popCtx.createOscillator();
    const gain = popCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(popCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    // a little bit of noise for realism
    const buffer = popCtx.createBuffer(1, popCtx.sampleRate * 0.05, popCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = popCtx.createBufferSource();
    noise.buffer = buffer;
    const nGain = popCtx.createGain();
    nGain.gain.value = 0.3;
    noise.connect(nGain);
    nGain.connect(popCtx.destination);
    noise.start(t);
  } catch (e) { /* ignore */ }
}

// ===== Confetti =====
const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let confettiActive = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const confettiColors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#5f27cd', '#f368e0', '#ffd32a', '#1dd1a1', '#fff'];

function launchConfetti() {
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 8,
      h: 6 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      shape: Math.random()
    });
  }
  confettiActive = true;
  if (!animating) requestAnimationFrame(animateConfetti);
}

let animating = false;
function animateConfetti() {
  animating = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.y < canvas.height + 20);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.rot += p.vrot;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape > 0.5) {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    animating = false;
    confettiActive = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ===== balloons are interactive from the start =====
makeBalloonsClickable();
replenishBalloons();

// ===== Interactive balloons (the floating ones pop on tap) =====
let popCount = 0;
let messageShown = false;
let birthdayRevealed = false;
const POP_TARGET = 10;
const POP_COUNTER_THRESHOLD = 3;
const balloonCounterEl = document.getElementById('balloonCounter');
const balloonCounterNum = document.getElementById('balloonCounterNum');
const hiddenMessageEl = document.getElementById('hiddenMessage');

function popBalloon(b) {
  if (b.classList.contains('pop')) return;
  b.classList.add('pop');
  const rect = b.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  playPopSound();
  burstConfetti(cx, cy);
  makeBurst(cx, cy, b.style.background);

  if (birthdayRevealed) {
    popCount++;
    updateBalloonCounter();
  }

  setTimeout(() => b.remove(), 450);
}

function updateBalloonCounter() {
  if (popCount >= POP_COUNTER_THRESHOLD && popCount < POP_TARGET) {
    balloonCounterEl.classList.remove('hidden');
    balloonCounterNum.textContent = popCount;
    balloonCounterEl.classList.remove('pop-bump');
    void balloonCounterEl.offsetWidth;
    balloonCounterEl.classList.add('pop-bump');
  }

  if (popCount >= POP_TARGET) {
    balloonCounterEl.classList.add('hidden');
    showHiddenMessage();
  }
}

function showHiddenMessage() {
  if (messageShown) return;
  messageShown = true;
  hiddenMessageEl.classList.remove('hidden');
  launchConfetti();

  const closeBtn = document.createElement('button');
  closeBtn.className = 'hidden-message-close';
  closeBtn.textContent = 'خلاص قريت';
  closeBtn.addEventListener('click', () => {
    hiddenMessageEl.classList.add('hidden');
    popCount = 0;
    messageShown = false;
    balloonCounterEl.classList.add('hidden');
  });
  hiddenMessageEl.querySelector('.hidden-message-inner').appendChild(closeBtn);

  const msgInterval = setInterval(() => {
    if (hiddenMessageEl.classList.contains('hidden')) {
      clearInterval(msgInterval);
      return;
    }
    launchConfetti();
  }, 3000);
}

function makeBurst(x, y, color) {
  const ring = document.createElement('div');
  ring.className = 'pop-burst';
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  ring.style.boxShadow = `0 0 0 3px ${color || '#fff'}, 0 0 25px 8px ${color || '#fff'}66`;
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 500);
}

function burstConfetti(x, y) {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x: x,
      y: y,
      w: 5 + Math.random() * 6,
      h: 5 + Math.random() * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      shape: Math.random()
    });
  }
  if (!animating) requestAnimationFrame(animateConfetti);
}

// make every floating balloon clickable so it pops on tap
function makeBalloonsClickable() {
  document.querySelectorAll('#balloons .balloon').forEach(b => {
    if (b.dataset.clickable) return;
    b.dataset.clickable = '1';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      popBalloon(b);
    });
  });
}

// keep replenishing balloons so there's always something to pop
function replenishBalloons() {
  setInterval(() => {
    const alive = document.querySelectorAll('#balloons .balloon').length;
    if (alive < 10) {
      const nb = spawnBalloon();
      nb.dataset.clickable = '1';
      nb.addEventListener('click', (e) => {
        e.stopPropagation();
        popBalloon(nb);
      });
    }
  }, 2500);
}

// ===== Countdown -> Reveal button -> Message =====
// العداد لحد 1/9/2027 الساعة 12 بليل
const targetDate = new Date(2027, 8, 1, 0, 0);

const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const countdownBox = document.getElementById('countdownBox');
const revealBtn = document.getElementById('revealBtn');
const messageBox = document.getElementById('messageBox');

function showRevealButton() {
  clearInterval(timerInterval);
  // hide the timer numbers, show the button
  document.getElementById('timer').classList.add('hidden');
  document.getElementById('countdownDone').classList.remove('hidden');
  revealBtn.classList.remove('hidden');
  launchConfetti();
}

let timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

revealBtn.addEventListener('click', () => {
  birthdayRevealed = true;
  revealBtn.classList.add('hidden');
  countdownBox.classList.add('hidden');   // hide the whole countdown box
  messageBox.classList.remove('hidden');  // show the message
  startAudio();                           // start the music
  launchConfetti();
  // celebrate with periodic bursts
  setInterval(() => {
    if (Math.random() < 0.4) launchConfetti();
  }, 5000);
  messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function updateCountdown() {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    showRevealButton();
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  daysEl.textContent = days;
  hoursEl.textContent = String(hours).padStart(2, '0');
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
}
