/* ============================================================
   APEX Granada — comportamiento compartido del sitio
   Cargado por todas las páginas. Cada bloque se auto-protege:
   solo se ejecuta si los elementos que necesita existen.
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── MENÚ MÓVIL ──────────────────────────────────────────
  const navEl = document.querySelector('nav');
  const navToggle = document.getElementById('nav-toggle');
  if (navEl && navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navEl.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    navEl.querySelectorAll('.nav-links a').forEach((a) => {
      a.addEventListener('click', () => {
        navEl.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  // ── ENLACE ACTIVO DEL NAV ───────────────────────────────
  if (navEl) {
    let here = location.pathname.split('/').pop();
    if (!here) here = 'index.html';
    navEl.querySelectorAll('.nav-links a').forEach((a) => {
      const target = a.getAttribute('href').split('/').pop();
      if (target === here && !a.classList.contains('nav-cta')) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── CURSOR (solo ratón real) ────────────────────────────
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if (cursor && ring) {
      let mx = -200, my = -200, rx = -200, ry = -200;
      document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
      (function animateCursor() {
        cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
        rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(animateCursor);
      })();
      document.querySelectorAll('a, button').forEach((el) => {
        el.addEventListener('mouseenter', () => {
          cursor.style.transform = 'translate(-50%,-50%) scale(2)';
          ring.style.width = '60px'; ring.style.height = '60px';
          ring.style.borderColor = 'rgba(232,52,28,0.8)';
        });
        el.addEventListener('mouseleave', () => {
          cursor.style.transform = 'translate(-50%,-50%) scale(1)';
          ring.style.width = '36px'; ring.style.height = '36px';
          ring.style.borderColor = 'rgba(232,52,28,0.5)';
        });
      });
    }
  }

  // ── REVEAL AL HACER SCROLL ──────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduceMotion) {
      reveals.forEach((el) => el.classList.add('visible'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.1 });
      reveals.forEach((el) => observer.observe(el));
    }
  }

  // ── ACORDEÓN FAQ ────────────────────────────────────────
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      q.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // ── SONIDO EN CTA (data-sound="id-del-audio") ───────────
  document.querySelectorAll('[data-sound]').forEach((el) => {
    el.addEventListener('click', () => {
      const audio = document.getElementById(el.dataset.sound);
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    });
  });

  // ── FORMULARIO DE RESERVA (Formspree + fallback mailto) ─
  const form = document.getElementById('reserva-form');
  if (form) {
    // Prerrellenar el "tipo" desde la URL: reservar.html?tipo=cumpleanos
    const tipo = new URLSearchParams(location.search).get('tipo');
    if (tipo) {
      const sel = form.querySelector('[name="tipo"]');
      if (sel) sel.value = tipo;
    }

    const status = document.getElementById('form-status');
    const fallbackEmail = form.dataset.email || 'hola@apexgranada.es';
    const showStatus = (cls, msg) => {
      if (!status) return;
      status.className = 'form-status show ' + cls;
      status.textContent = msg;
      status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    };
    const mailtoFallback = () => {
      const get = (n) => (form.querySelector('[name="' + n + '"]') || {}).value || '';
      const body =
        'Nombre: ' + get('nombre') + '\n' +
        'Email: ' + get('email') + '\n' +
        'Teléfono: ' + get('telefono') + '\n' +
        'Tipo: ' + get('tipo') + '\n' +
        'Fecha: ' + get('fecha') + '\n' +
        'Personas: ' + get('personas') + '\n\n' +
        get('mensaje');
      window.location.href =
        'mailto:' + fallbackEmail +
        '?subject=' + encodeURIComponent('Reserva APEX — ' + get('nombre')) +
        '&body=' + encodeURIComponent(body);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const action = form.getAttribute('action') || '';
      // Sin endpoint configurado todavía → abrir cliente de correo
      if (!action || action.indexOf('your_form_id') !== -1) {
        showStatus('ok', 'Abriendo tu cliente de correo para enviar la solicitud…');
        mailtoFallback();
        return;
      }
      try {
        const res = await fetch(action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          form.reset();
          showStatus('ok', '¡Solicitud enviada! Te contactaremos para confirmar tu reserva.');
        } else {
          showStatus('err', 'No se pudo enviar. Inténtalo de nuevo o escríbenos a ' + fallbackEmail + '.');
        }
      } catch (err) {
        showStatus('err', 'Sin conexión con el servidor. Abrimos tu correo como alternativa…');
        mailtoFallback();
      }
    });
  }

  // ── TELEMETRÍA EN TIEMPO REAL (solo si existe el HUD) ───
  // Sistema preparado para conectar a simuladores reales vía WebSocket.
  // Compatible con SimHub, ACC broadcast, iRacing SDK o servidores propios.
  // Mientras no haya conexión activa muestra un modo DEMO paramétrico.
  if (document.getElementById('hud-speed')) {
    const HUD = {
      speed:    document.getElementById('hud-speed'),
      rpm:      document.getElementById('hud-rpm'),
      throttle: document.getElementById('hud-throttle'),
      brake:    document.getElementById('hud-brake'),
      steering: document.getElementById('hud-steering'),
      clutch:   document.getElementById('hud-clutch'),
      lap:      document.getElementById('hud-lap'),
      gear:     document.getElementById('hud-gear'),
      circuit:  document.getElementById('hud-circuit'),
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function fmtLap(t) {
      if (typeof t !== 'number') return t || '--:--.---';
      const m = Math.floor(t / 60);
      const s = (t - m * 60).toFixed(3);
      return m + ':' + s.padStart(6, '0');
    }

    function updateHUD(d) {
      if (!d) return;
      if (HUD.speed && d.speed != null)       HUD.speed.textContent    = String(Math.round(d.speed)).padStart(3, '0');
      if (HUD.rpm && d.rpm != null)           HUD.rpm.textContent      = Math.round(d.rpm);
      if (HUD.throttle && d.throttle != null) HUD.throttle.style.width = clamp(d.throttle * 100, 0, 100) + '%';
      if (HUD.brake && d.brake != null)       HUD.brake.style.width    = clamp(d.brake * 100, 0, 100) + '%';
      if (HUD.steering && d.steering != null) HUD.steering.style.width = clamp((d.steering + 1) / 2 * 100, 0, 100) + '%';
      if (HUD.clutch && d.clutch != null)     HUD.clutch.style.width   = clamp(d.clutch * 100, 0, 100) + '%';
      if (HUD.lap && d.currentLap != null)    HUD.lap.textContent      = fmtLap(d.currentLap);
      if (HUD.gear && d.gear != null)         HUD.gear.textContent     = d.gear === 0 ? 'N' : (d.gear === -1 ? 'R' : d.gear);
      if (HUD.circuit && d.circuit != null)   HUD.circuit.textContent  = d.circuit;
    }

    const demoLap = [
      { dur: 6.0, speed: 280, rpm: 7200, throttle: 1.00, brake: 0.00, gear: 6, steering:  0.00 },
      { dur: 1.4, speed: 110, rpm: 4500, throttle: 0.00, brake: 0.95, gear: 3, steering: -0.55 },
      { dur: 3.5, speed: 130, rpm: 5800, throttle: 0.60, brake: 0.00, gear: 3, steering: -0.70 },
      { dur: 4.5, speed: 220, rpm: 6800, throttle: 0.95, brake: 0.00, gear: 5, steering:  0.10 },
      { dur: 1.2, speed:  90, rpm: 3500, throttle: 0.00, brake: 0.92, gear: 2, steering:  0.65 },
      { dur: 3.0, speed: 100, rpm: 5200, throttle: 0.72, brake: 0.00, gear: 2, steering:  0.80 },
      { dur: 4.0, speed: 200, rpm: 6500, throttle: 0.95, brake: 0.00, gear: 5, steering:  0.00 },
      { dur: 5.0, speed: 260, rpm: 7000, throttle: 1.00, brake: 0.00, gear: 6, steering:  0.00 },
    ];
    const SHIFT_WINDOW = 0.13;
    const DEMO_TOTAL = demoLap.reduce((s, x) => s + x.dur, 0);

    function demoState(t) {
      const cycle = t % DEMO_TOTAL;
      let acc = 0;
      for (let i = 0; i < demoLap.length; i++) {
        const s = demoLap[i];
        if (cycle < acc + s.dur) {
          const next = demoLap[(i + 1) % demoLap.length];
          const u = (cycle - acc) / s.dur;
          const k = u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u;
          const lerp = (a, b) => a + (b - a) * k;
          const timeInSeg = cycle - acc;
          const timeToEnd = s.dur - timeInSeg;
          const prev = demoLap[(i - 1 + demoLap.length) % demoLap.length];
          const clutch = (prev.gear !== s.gear && timeInSeg < SHIFT_WINDOW) ||
                         (s.gear !== next.gear && timeToEnd < SHIFT_WINDOW) ? 1 : 0;
          return {
            speed:    lerp(s.speed,    next.speed),
            rpm:      lerp(s.rpm,      next.rpm),
            throttle: lerp(s.throttle, next.throttle),
            brake:    lerp(s.brake,    next.brake),
            steering: lerp(s.steering, next.steering),
            clutch,
            gear: s.gear,
            currentLap: cycle,
            circuit: 'SIERRA GR · DEMO',
          };
        }
        acc += s.dur;
      }
      return null;
    }

    let ws = null;
    let conn = 'demo';
    let demoT = 0;
    let lastTick = performance.now();

    function tick(now) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      if (conn !== 'live' && !reduceMotion) {
        demoT += dt;
        updateHUD(demoState(demoT));
      }
      requestAnimationFrame(tick);
    }
    if (reduceMotion) updateHUD(demoState(2)); // fotograma estático
    requestAnimationFrame(tick);

    function setConn(state) {
      conn = state;
      const dot = document.getElementById('tele-dot');
      const lbl = document.getElementById('tele-label');
      if (!dot || !lbl) return;
      const map = {
        demo:       { c: '#f59e0b', t: 'DEMO' },
        connecting: { c: '#22d3ee', t: 'CONECTANDO…' },
        live:       { c: '#10b981', t: '● EN VIVO' },
        error:      { c: '#e8341c', t: 'SIN CONEXIÓN' },
      };
      const v = map[state];
      dot.style.background = v.c;
      dot.style.boxShadow = '0 0 8px ' + v.c;
      lbl.style.color = v.c;
      lbl.textContent = v.t;
    }

    function connect(url) {
      if (ws) { try { ws.close(); } catch (e) {} ws = null; }
      setConn('connecting');
      try {
        ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          if (ws && ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch (e) {}
            setConn('error');
          }
        }, 5000);
        ws.onopen = () => { clearTimeout(timeout); setConn('live'); };
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            updateHUD({
              speed:      data.speed      ?? data.SpeedKmh      ?? data.Speed,
              rpm:        data.rpm        ?? data.Rpms          ?? data.RPM,
              gear:       data.gear       ?? data.Gear,
              throttle:   data.throttle   ?? data.Throttle,
              brake:      data.brake      ?? data.Brake,
              steering:   data.steering   ?? data.Steering,
              clutch:     data.clutch     ?? data.Clutch,
              currentLap: data.currentLap ?? data.CurrentLapTime,
              circuit:    data.circuit    ?? data.TrackName,
            });
          } catch (e) { /* payload no JSON */ }
        };
        ws.onerror = () => { clearTimeout(timeout); setConn('error'); };
        ws.onclose = () => {
          clearTimeout(timeout);
          if (conn === 'live') setConn('demo');
          ws = null;
        };
      } catch (e) {
        setConn('error');
      }
    }

    function disconnect() {
      if (ws) { try { ws.close(); } catch (e) {} ws = null; }
      setConn('demo');
    }

    // Panel flotante de telemetría
    const panel = document.createElement('button');
    panel.id = 'telemetry-panel';
    panel.innerHTML =
      '<span id="tele-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 8px #f59e0b;"></span>' +
      '<span id="tele-label" style="color:#f59e0b;">DEMO</span>' +
      '<span style="color:#6b7280">· TELEMETRÍA</span>';
    panel.style.cssText =
      'position:fixed;bottom:1.5rem;right:1.5rem;z-index:200;' +
      "font-family:'Space Mono',monospace;font-size:0.6rem;" +
      'letter-spacing:0.15em;text-transform:uppercase;' +
      'background:rgba(9,9,9,0.92);color:#e8eaed;' +
      'border:1px solid #1a1d20;padding:0.65rem 1rem;' +
      'display:flex;align-items:center;gap:0.55rem;transition:border-color 0.2s;';
    panel.addEventListener('mouseenter', () => panel.style.borderColor = '#e8341c');
    panel.addEventListener('mouseleave', () => panel.style.borderColor = '#1a1d20');
    panel.addEventListener('click', openModal);
    document.body.appendChild(panel);

    function openModal() {
      if (document.getElementById('tele-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'tele-modal';
      modal.style.cssText =
        'position:fixed;inset:0;z-index:1000;' +
        'background:rgba(9,9,9,0.85);backdrop-filter:blur(8px);' +
        'display:flex;align-items:center;justify-content:center;';
      const savedUrl = (typeof localStorage !== 'undefined' && localStorage.getItem('apex-tele-url')) || 'ws://localhost:8765/telemetry';
      modal.innerHTML =
        '<div style="background:#111213;border:1px solid #1a1d20;padding:2.5rem;max-width:520px;width:90%;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:0.6rem;letter-spacing:0.2em;color:#e8341c;text-transform:uppercase;margin-bottom:0.5rem;">— Telemetría en tiempo real</div>' +
        '<h3 style="font-family:\'Bebas Neue\',sans-serif;font-size:1.9rem;letter-spacing:0.05em;color:#f5f5f3;margin-bottom:1.2rem;line-height:1;">Conectar simulador</h3>' +
        '<p style="color:#9ca3af;font-size:0.92rem;line-height:1.7;margin-bottom:1.5rem;font-family:\'Crimson Pro\',serif;">Introduce la URL del servidor WebSocket de telemetría. Compatible con <strong style="color:#e8eaed">SimHub</strong>, plugins broadcast de <strong style="color:#e8eaed">ACC</strong>, puentes para <strong style="color:#e8eaed">iRacing</strong> o servidores propios.</p>' +
        '<label style="display:block;font-family:\'Space Mono\',monospace;font-size:0.62rem;letter-spacing:0.15em;color:#6b7280;text-transform:uppercase;margin-bottom:0.5rem;">URL WebSocket</label>' +
        '<input id="tele-url" type="text" value="' + savedUrl + '" placeholder="ws://localhost:8765/telemetry" style="width:100%;background:#090909;border:1px solid #1a1d20;color:#f5f5f3;padding:0.85rem 1rem;font-family:\'Space Mono\',monospace;font-size:0.82rem;margin-bottom:1rem;outline:none;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:0.58rem;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:0.6rem;">Preajustes rápidos</div>' +
        '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.8rem;">' +
        '<button class="tele-preset" data-url="ws://localhost:8765/telemetry" style="font-family:\'Space Mono\',monospace;font-size:0.6rem;letter-spacing:0.12em;background:#1a1d20;color:#e8eaed;border:none;padding:0.5rem 0.9rem;text-transform:uppercase;">Custom local</button>' +
        '<button class="tele-preset" data-url="ws://localhost:8888/api/v2/ws" style="font-family:\'Space Mono\',monospace;font-size:0.6rem;letter-spacing:0.12em;background:#1a1d20;color:#e8eaed;border:none;padding:0.5rem 0.9rem;text-transform:uppercase;">SimHub</button>' +
        '<button class="tele-preset" data-url="ws://localhost:4000/iracing" style="font-family:\'Space Mono\',monospace;font-size:0.6rem;letter-spacing:0.12em;background:#1a1d20;color:#e8eaed;border:none;padding:0.5rem 0.9rem;text-transform:uppercase;">iRacing bridge</button>' +
        '</div>' +
        '<div style="display:flex;gap:0.8rem;justify-content:flex-end;">' +
        '<button id="tele-cancel" style="font-family:\'Space Mono\',monospace;font-size:0.7rem;letter-spacing:0.12em;background:transparent;color:#9ca3af;border:1px solid #1a1d20;padding:0.85rem 1.4rem;text-transform:uppercase;">' + (conn === 'live' ? 'Desconectar' : 'Cancelar') + '</button>' +
        '<button id="tele-connect" style="font-family:\'Space Mono\',monospace;font-size:0.7rem;letter-spacing:0.12em;background:#e8341c;color:#fff;border:none;padding:0.85rem 1.8rem;text-transform:uppercase;">Conectar</button>' +
        '</div>' +
        '<div style="margin-top:1.8rem;padding-top:1.2rem;border-top:1px solid #1a1d20;font-family:\'Space Mono\',monospace;font-size:0.56rem;letter-spacing:0.1em;color:#3a3f47;line-height:1.7;text-transform:uppercase;">JSON esperado: { speed · rpm · gear · throttle (0–1) · brake (0–1) · steering (−1 a 1) · clutch (0–1) · currentLap · circuit }</div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.querySelectorAll('.tele-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.getElementById('tele-url').value = btn.dataset.url;
        });
      });
      modal.querySelector('#tele-cancel').addEventListener('click', () => {
        if (conn === 'live') disconnect();
        modal.remove();
      });
      modal.querySelector('#tele-connect').addEventListener('click', () => {
        const url = document.getElementById('tele-url').value.trim();
        if (!url) return;
        try { if (typeof localStorage !== 'undefined') localStorage.setItem('apex-tele-url', url); } catch (e) {}
        connect(url);
        modal.remove();
      });
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
      });
    }
  }
})();
