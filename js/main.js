(function () {
  const body = document.body;
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const syncScrolled = function () {
    body.classList.toggle('is-scrolled', window.scrollY > 12);
  };

  syncScrolled();
  window.addEventListener('scroll', syncScrolled, { passive: true });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) {
      body.classList.remove('nav-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });

  const initCeladonLines = function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const canvasSupported = Boolean(document.createElement('canvas').getContext);

    if (reduceMotion || coarsePointer || !canvasSupported) return;

    const panels = Array.prototype.slice.call(document.querySelectorAll('.entry-panel, .section-panel, .hero-panel'));
    if (!panels.length) return;

    const clamp = function (value, min, max) {
      return Math.min(Math.max(value, min), max);
    };

    const taijiTone = function (x, y) {
      const inTopLobe = Math.hypot(x, y + 0.5) < 0.5;
      const inBottomLobe = Math.hypot(x, y - 0.5) < 0.5;
      let dark = x < 0;

      if (inTopLobe) dark = false;
      if (inBottomLobe) dark = true;

      return dark ? 'dark' : 'light';
    };

    const buildTaijiTargets = function (count) {
      const targets = [];
      const mainCount = Math.max(40, Math.round(count * 0.84));
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const holeRadius = 0.145;
      let index = 0;

      while (targets.length < mainCount && index < mainCount * 3) {
        const radius = Math.sqrt((index + 0.5) / mainCount) * 0.94;
        const angle = index * goldenAngle;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const topHole = Math.hypot(x, y + 0.5) < holeRadius;
        const bottomHole = Math.hypot(x, y - 0.5) < holeRadius;

        if (!topHole && !bottomHole) {
          targets.push({
            x: x,
            y: y,
            tone: taijiTone(x, y)
          });
        }

        index += 1;
      }

      const holeCount = Math.max(14, Math.round(count * 0.08));
      for (let i = 0; i < holeCount; i += 1) {
        const angle = (i / holeCount) * Math.PI * 2;
        const radius = (i % 2 ? 0.05 : 0.1);
        targets.push({
          x: Math.cos(angle) * radius,
          y: -0.5 + Math.sin(angle) * radius,
          tone: 'dark-dot'
        });
        targets.push({
          x: Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius,
          tone: 'light-dot'
        });
      }

      return targets.slice(0, count);
    };

    const effects = panels.map(function (panel) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const pointer = {
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        active: false,
        energy: 0,
        movedAt: 0
      };
      const particles = [];
      let targets = [];
      let width = 0;
      let height = 0;
      let ratio = 1;
      let canvasTop = 0;
      let visible = true;

      canvas.className = 'celadon-line-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.left = '0';
      canvas.style.right = 'auto';
      canvas.style.bottom = 'auto';
      panel.insertBefore(canvas, panel.firstChild);

      const resetParticles = function () {
        const count = Math.max(110, Math.min(220, Math.round((width * height) / 6200)));
        targets = buildTaijiTargets(count);
        particles.length = 0;
        for (let i = 0; i < count; i += 1) {
          const target = targets[i % targets.length];
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            r: Math.random() * 1.05 + 0.85,
            scatter: Math.random() * Math.PI * 2,
            target: target
          });
        }
      };

      const syncCanvasFrame = function (forceResize) {
        const rect = panel.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
        const nextRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const panelHeight = panel.clientHeight;
        const nextWidth = panel.clientWidth;
        const nextHeight = Math.max(1, Math.min(panelHeight, Math.max(180, viewportHeight + 320)));
        const maxTop = Math.max(0, panelHeight - nextHeight);
        const nextTop = clamp(-rect.top - 160, 0, maxTop);
        const sizeChanged = forceResize || nextWidth !== width || nextHeight !== height || nextRatio !== ratio;

        visible = rect.bottom > -260 && rect.top < viewportHeight + 260;
        if (forceResize || Math.abs(nextTop - canvasTop) > 0.5) {
          canvasTop = nextTop;
          canvas.style.top = canvasTop + 'px';
        }

        if (!sizeChanged) return;

        ratio = nextRatio;
        width = nextWidth;
        height = nextHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        resetParticles();
      };

      const resize = function () {
        syncCanvasFrame(true);
      };

      const setPointer = function (event) {
        syncCanvasFrame(false);
        const rect = panel.getBoundingClientRect();
        const nextX = event.clientX - rect.left;
        const nextY = event.clientY - rect.top - canvasTop;
        const movement = pointer.active ? Math.hypot(nextX - pointer.lastX, nextY - pointer.lastY) : 0;

        pointer.lastX = nextX;
        pointer.lastY = nextY;
        pointer.energy = clamp(pointer.energy * 0.78 + movement / 36, 0, 1);
        pointer.movedAt = performance.now();
        pointer.x = nextX;
        pointer.y = nextY;
        pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= width && pointer.y <= height;
      };

      const burstParticles = function (event) {
        syncCanvasFrame(false);
        const rect = panel.getBoundingClientRect();
        const originX = event.clientX - rect.left;
        const originY = event.clientY - rect.top - canvasTop;
        const blastRadius = Math.max(160, Math.min(260, Math.min(width, height) * 0.62));

        pointer.x = originX;
        pointer.y = originY;
        pointer.lastX = originX;
        pointer.lastY = originY;
        pointer.active = originX >= 0 && originY >= 0 && originX <= width && originY <= height;
        pointer.energy = 1;
        pointer.movedAt = performance.now();

        particles.forEach(function (p, index) {
          const dx = p.x - originX;
          const dy = p.y - originY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > blastRadius) return;

          const falloff = 1 - distance / blastRadius;
          const angle = distance > 0.1
            ? Math.atan2(dy, dx)
            : Math.random() * Math.PI * 2;
          const randomSpread = (Math.random() - 0.5) * Math.PI * 0.82;
          const ripple = Math.sin(index * 0.91 + performance.now() * 0.01) * Math.PI * 0.12;
          const blastAngle = angle + randomSpread + ripple;
          const speed = falloff * falloff * (4.8 + Math.random() * 6.8);

          p.vx += Math.cos(blastAngle) * speed;
          p.vy += Math.sin(blastAngle) * speed;
        });
      };

      panel.addEventListener('mousemove', setPointer, { passive: true });
      panel.addEventListener('pointerdown', burstParticles, { passive: true });
      panel.addEventListener('mouseleave', function () {
        pointer.active = false;
      }, { passive: true });

      resize();
      return {
        ctx: ctx,
        pointer: pointer,
        particles: particles,
        resize: resize,
        sync: syncCanvasFrame,
        isVisible: function () { return visible; },
        getSize: function () { return { width: width, height: height }; }
      };
    });

    const particleColor = function (tone, alpha) {
      if (tone === 'light' || tone === 'light-dot') return 'rgba(255, 254, 247, ' + alpha.toFixed(3) + ')';
      return 'rgba(31, 111, 117, ' + alpha.toFixed(3) + ')';
    };

    const particleStroke = function (tone, alpha) {
      if (tone === 'light' || tone === 'light-dot') return 'rgba(31, 111, 117, ' + (alpha * 0.7).toFixed(3) + ')';
      return 'rgba(16, 72, 66, ' + (alpha * 0.85).toFixed(3) + ')';
    };

    const tick = function () {
      effects.forEach(function (effect) {
        effect.sync(false);
        if (!effect.isVisible()) return;

        const size = effect.getSize();
        const ctx = effect.ctx;
        const pointer = effect.pointer;
        const particles = effect.particles;
        const width = size.width;
        const height = size.height;
        const now = performance.now();
        const symbolRadius = Math.max(58, Math.min(96, Math.min(width, height) * 0.24));
        const movementAge = now - pointer.movedAt;
        const movementEnergy = pointer.active
          ? pointer.energy * (movementAge < 140 ? 1 : 0.95)
          : 0;
        const center = pointer.active
          ? {
              x: clamp(pointer.x, symbolRadius + 18, Math.max(symbolRadius + 18, width - symbolRadius - 18)),
              y: clamp(pointer.y, symbolRadius + 18, Math.max(symbolRadius + 18, height - symbolRadius - 18))
            }
          : null;

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];

          if (pointer.active) {
            const targetX = center.x + p.target.x * symbolRadius;
            const targetY = center.y + p.target.y * symbolRadius;
            const dx = targetX - p.x;
            const dy = targetY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = Math.max(260, Math.sqrt(width * width + height * height) * 0.72);

            if (distance > 1) {
              const proximity = Math.max(0, 1 - distance / radius);
              const pointerDistance = Math.hypot(pointer.x - p.x, pointer.y - p.y);
              const pointerBoost = Math.max(0, 1 - pointerDistance / 230);
              const nearMovement = movementEnergy * pointerBoost;
              const pull = (0.0036 + proximity * proximity * 0.018 + pointerBoost * 0.018) * (1 - nearMovement * 0.62);
              p.vx += (dx / distance) * pull;
              p.vy += (dy / distance) * pull;

              if (nearMovement > 0.025 && pointerDistance > 0.1) {
                const burst = nearMovement * nearMovement * 0.42;
                const awayX = (p.x - pointer.x) / pointerDistance;
                const awayY = (p.y - pointer.y) / pointerDistance;
                const noise = Math.sin(p.scatter + now * 0.008 + i * 0.37);
                const tangentX = -awayY * noise;
                const tangentY = awayX * noise;

                p.vx += awayX * burst + tangentX * burst * 0.72 + (Math.random() - 0.5) * burst * 0.34;
                p.vy += awayY * burst + tangentY * burst * 0.72 + (Math.random() - 0.5) * burst * 0.34;
              }
            }
          } else {
            const driftAngle = p.scatter + now * 0.0018 + Math.sin(now * 0.001 + i * 0.73) * 1.4;
            const jitter = 0.012 + Math.random() * 0.016;
            p.vx += Math.cos(driftAngle) * jitter + (Math.random() - 0.5) * 0.018;
            p.vy += Math.sin(driftAngle) * jitter + (Math.random() - 0.5) * 0.018;

            const freeSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const maxFreeSpeed = 1.35;
            if (freeSpeed > maxFreeSpeed) {
              p.vx = (p.vx / freeSpeed) * maxFreeSpeed;
              p.vy = (p.vy / freeSpeed) * maxFreeSpeed;
            }
          }

          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.985;
          p.vy *= 0.985;

          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;

          ctx.beginPath();
          ctx.fillStyle = particleColor(p.target.tone, p.target.tone === 'light' || p.target.tone === 'light-dot' ? 0.82 : 0.58);
          ctx.strokeStyle = particleStroke(p.target.tone, 0.62);
          ctx.lineWidth = 0.55;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (pointer.active) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 190) {
              ctx.beginPath();
              ctx.fillStyle = particleStroke(p.target.tone, 0.12 * (1 - distance / 190));
              ctx.arc(pointer.x, pointer.y, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        pointer.energy *= movementAge > 80 ? 0.9 : 0.96;
      });

      window.requestAnimationFrame(tick);
    };

    window.addEventListener('resize', function () {
      effects.forEach(function (effect) {
        effect.resize();
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        effects.forEach(function (effect) {
          effect.resize();
        });
      }
    });

    window.requestAnimationFrame(tick);
  };

  initCeladonLines();
})();
