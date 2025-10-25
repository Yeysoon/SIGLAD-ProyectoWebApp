document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const btnText = document.getElementById('btnText');

  // Mapeo de roles
  const roleRedirectMap = {
    ADMIN: '/usuarios.html',
    TRANSPORTISTA: '/dashboardDuca.html',
    AGENTE: '/dashboardAgente.html',
    IMPORTADOR: '/importador.html',
  };

  const defaultPage = '/usuarios.html';

  // ========== INICIAR EFECTO DE AGUA ==========
  initWaterEffect();

  // ========== LÓGICA DE LOGIN (SIN CAMBIOS) ==========
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    limpiarMensaje();

    btn.disabled = true;
    btnText.textContent = 'Procesando...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      if (!email) {
        document.getElementById('email').classList.add('error');
        setTimeout(() => document.getElementById('email').classList.remove('error'), 1000);
      }
      if (!password) {
        document.getElementById('password').classList.add('error');
        setTimeout(() => document.getElementById('password').classList.remove('error'), 1000);
      }
      
      mostrarMensaje('Por favor completa todos los campos', 'warning');
      btn.disabled = false;
      btnText.textContent = 'Iniciar Sesión';
      return;
    }

    try {
      console.log('Enviando login:', { email });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Respuesta login:', { status: res.status, ok: data.ok, error: data.error });

      if (res.status === 403) {
        mostrarMensaje('Usuario deshabilitado. Contacta al administrador.', 'error');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      if (res.status === 401) {
        mostrarMensaje('Usuario o contraseña incorrecta', 'warning');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      if (res.status === 400) {
        const mensajeError = data.error || 'Credenciales inválidas';
        const tipo = mensajeError.toLowerCase().includes('inactivo') || 
                     mensajeError.toLowerCase().includes('deshabilitado') ? 'error' : 'warning';
        mostrarMensaje(mensajeError, tipo);
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      if (!res.ok || !data.ok) {
        const errorMsg = data?.error || 'Usuario o contraseña incorrecta';
        mostrarMensaje(errorMsg, 'warning');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      if (!data.user || !data.user.role) {
        mostrarMensaje('Error: Tu usuario no tiene rol asignado', 'error');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      console.log('Login exitoso:', data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      mostrarMensaje(`¡Bienvenido ${data.user.full_name}!`, 'success');

      setTimeout(() => {
        const role = data.user.role;
        const redirectURL = roleRedirectMap[role] || defaultPage;
        console.log('Redirigiendo a:', redirectURL);
        location.replace(redirectURL);
      }, 1500);
    } catch (err) {
      console.error('Error de conexión:', err);
      mostrarMensaje('No se pudo conectar. Intenta de nuevo.', 'error');
      btn.disabled = false;
      btnText.textContent = 'Iniciar Sesión';
    }
  });

  function mostrarMensaje(texto, tipo = 'warning') {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success');

    let icono = 'fas fa-exclamation-triangle';
    if (tipo === 'error') icono = 'fas fa-times-circle';
    if (tipo === 'success') icono = 'fas fa-check-circle';

    msg.innerHTML = `<i class="${icono}"></i> ${texto}`;
    msg.classList.add(tipo, 'show');
  }

  function limpiarMensaje() {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success');
  }

  document.getElementById('email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });

  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });

  // ========== EFECTO DE AGUA REALISTA (AZUL MARINO OSCURO) ==========
  function initWaterEffect() {
    const canvas = document.getElementById('waterCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let time = 0;
    
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Partículas de espuma
    const foamParticles = [];
    for (let i = 0; i < 150; i++) {
      foamParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    function drawWater() {
      // Fondo azul marino oscuro con gradiente
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#051627');    // Muy oscuro
      gradient.addColorStop(0.4, '#0a2540');  // Oscuro
      gradient.addColorStop(0.7, '#0d3b66');  // Medio
      gradient.addColorStop(1, '#0a1520');    // Muy oscuro abajo
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ondulaciones del agua
      ctx.save();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.5);
        
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height * 0.5 + 
                    Math.sin(x * 0.005 + time * 0.03 + i) * 20 +
                    Math.sin(x * 0.008 + time * 0.02 + i * 2) * 15;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const waveGradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
        waveGradient.addColorStop(0, `rgba(255, 255, 255, ${0.03 - i * 0.01})`);
        waveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = waveGradient;
        ctx.fill();
      }
      ctx.restore();

      // Dibujar espuma (más realista)
      foamParticles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Rebote suave
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -0.8;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -0.8;

        // Mantener dentro del canvas
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // Dibujar partícula de espuma
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Añadir líneas de espuma conectadas
        if (Math.random() > 0.98) {
          const nearbyParticles = foamParticles.filter(p => 
            Math.hypot(p.x - particle.x, p.y - particle.y) < 50
          );
          
          nearbyParticles.slice(0, 2).forEach(nearby => {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(nearby.x, nearby.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          });
        }
      });

      time++;
      requestAnimationFrame(drawWater);
    }

    drawWater();
  }
});