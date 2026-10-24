/**
 * confetti.js
 * Celebration effects using canvas-confetti
 */
import confetti from 'canvas-confetti';

// 🎉 Basic celebration (default)
export function launchConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#2563eb', '#14b8a6', '#facc15', '#ec4899', '#10b981', '#8b5cf6']
  });
}

// 🌟 Stars burst
export function celebrateStars() {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'],
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
  };
  confetti({ ...defaults, particleCount: 40, scalar: 1.2 });
  confetti({ ...defaults, particleCount: 10, scalar: 0.75 });
}

// 🔥 Streak celebration
export function celebrateStreak(days) {
  const fire = () => {
    confetti({ particleCount: 30, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff6b35', '#f7931e', '#ffd700'] });
    confetti({ particleCount: 30, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff6b35', '#f7931e', '#ffd700'] });
  };
  fire();
  if (days >= 7) setTimeout(fire, 200);
  if (days >= 14) setTimeout(fire, 400);
}

// 🏆 Level up celebration
export function celebrateLevelUp() {
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#6366f1', '#8b5cf6', '#a855f7'] });
    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#6366f1', '#8b5cf6', '#a855f7'] });
    if (Date.now() < animationEnd) requestAnimationFrame(frame);
  };
  frame();
}

// ✅ Lesson complete
export function celebrateLessonComplete() {
  confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#10b981', '#34d399', '#6ee7b7'] });
}

// 🎯 Quiz perfect score
export function celebratePerfectScore() {
  const count = 200;
  const defaults = { origin: { y: 0.7 } };
  function fire(particleRatio, opts) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

// 📚 Subject mastery
export function celebrateMastery() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const colors = ['#ffd700', '#ff6b35', '#10b981', '#3b82f6', '#8b5cf6'];
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < animationEnd) requestAnimationFrame(frame);
  }());
}

export default { launchConfetti, celebrateStars, celebrateStreak, celebrateLevelUp, celebrateLessonComplete, celebratePerfectScore, celebrateMastery };
