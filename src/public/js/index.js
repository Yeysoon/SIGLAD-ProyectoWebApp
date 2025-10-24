document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const btnText = document.getElementById('btnText');

  // Mapeo de roles a la página de inicio
  const roleRedirectMap = {
    ADMIN: '/usuarios.html',
    TRANSPORTISTA: '/dashboardDuca.html',
    AGENTE: '/dashboardAgente.html',
    IMPORTADOR: '/importador.html',
  };

  const defaultPage = '/usuarios.html';

  // ========== INICIAR EFECTO DE AGUA REALISTA ==========
  initWaterEffect();

  // ========== ANIMACIONES EN INPUTS ==========
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  if (emailInput) {
    emailInput.addEventListener('focus', function() {
      const wrapper = this.closest('.form-group');
      if (wrapper) {
        wrapper.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
          wrapper.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('focus', function() {
      const wrapper = this.closest('.form-group');
      if (wrapper) {
        wrapper.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
          wrapper.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
      }
    });
  }

  // ========== TU LÓGICA ORIGINAL DE LOGIN (SIN MODIFICAR) ==========
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpiar mensaje anterior
    limpiarMensaje();

    // Desabilitar botón
    btn.disabled = true;
    btnText.textContent = 'Procesando...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validaciones básicas
    if (!email || !password) {
      // Animación de error en campos vacíos
      if (!email && emailInput) {
        emailInput.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => emailInput.classList.remove('animate__animated', 'animate__shakeX'), 1000);
      }
      if (!password && passwordInput) {
        passwordInput.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => passwordInput.classList.remove('animate__animated', 'animate__shakeX'), 1000);
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
      console.log('Respuesta login:', {
        status: res.status,
        ok: data.ok,
        error: data.error,
      });

      // [FA02] Usuario inactivo - Status 403
      if (res.status === 403) {
        form.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => form.classList.remove('animate__animated', 'animate__shakeX'), 1000);
        
        mostrarMensaje(
          'Usuario deshabilitado. Contacta al administrador.',
          'error'
        );
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // [FA01] Credenciales inválidas - Status 401
      if (res.status === 401) {
        form.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => form.classList.remove('animate__animated', 'animate__shakeX'), 1000);
        
        mostrarMensaje('Usuario o contraseña incorrecta', 'warning');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // Status 400 - Validar el mensaje
      if (res.status === 400) {
        form.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => form.classList.remove('animate__animated', 'animate__shakeX'), 1000);
        
        const mensajeError = data.error || 'Credenciales inválidas';

        // Si contiene "inactivo" o "deshabilitado" → es inactivo
        if (
          mensajeError.toLowerCase().includes('inactivo') ||
          mensajeError.toLowerCase().includes('deshabilitado')
        ) {
          mostrarMensaje(mensajeError, 'error');
        } else {
          mostrarMensaje(mensajeError, 'warning');
        }

        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // Otros errores
      if (!res.ok || !data.ok) {
        form.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => form.classList.remove('animate__animated', 'animate__shakeX'), 1000);
        
        const errorMsg = data?.error || 'Usuario o contraseña incorrecta';
        mostrarMensaje(errorMsg, 'warning');

        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // Validar que el usuario tenga rol
      if (!data.user || !data.user.role) {
        mostrarMensaje('Error: Tu usuario no tiene rol asignado', 'error');

        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // Login exitoso
      console.log('Login exitoso:', data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Mostrar mensaje de éxito EN EL HTML
      mostrarMensaje(`¡Bienvenido ${data.user.full_name}!`, 'success');

      // Redirigir después de 1.5 segundos
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

  // Función para mostrar mensaje en el HTML (CON ANIMACIONES)
  function mostrarMensaje(texto, tipo = 'warning') {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success', 'animate__animated', 'animate__bounceIn');

    let icono = 'fas fa-exclamation-triangle';
    if (tipo === 'error') icono = 'fas fa-times-circle';
    if (tipo === 'success') icono = 'fas fa-check-circle';
    if (tipo === 'warning') icono = 'fas fa-exclamation-triangle';

    msg.innerHTML = `<i class="${icono}"></i> ${texto}`;
    msg.classList.add(tipo, 'show', 'animate__animated', 'animate__bounceIn');
  }

  // Función para limpiar mensaje
  function limpiarMensaje() {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success', 'animate__animated', 'animate__bounceIn');
  }

  // Permitir presionar Enter en los inputs
  document.getElementById('email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });

  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });

  // ========== EFECTO DE AGUA REALISTA CON CANVAS ==========
  function initWaterEffect() {
    const canvas = document.getElementById('waterCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let waves = [];
    let mouseX = 0;
    let mouseY = 0;

    // Ajustar tamaño del canvas
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Seguimiento del mouse para efecto parallax
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Clase para partículas de espuma
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      update() {
        this.y -= this.speedY;
        if (this.y < -10) {
          this.y = canvas.height + 10;
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Clase para olas
    class Wave {
      constructor(y, amplitude, frequency, speed) {
        this.y = y;
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.speed = speed;
        this.offset = 0;
      }

      update() {
        this.offset += this.speed;
      }

      draw() {
        ctx.beginPath();
        ctx.moveTo(0, this.y);

        for (let x = 0; x < canvas.width; x++) {
          const y = this.y + Math.sin((x * this.frequency) + this.offset) * this.amplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, this.y - 50, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(14, 59, 102, 0.6)');
        gradient.addColorStop(0.5, 'rgba(10, 25, 41, 0.8)');
        gradient.addColorStop(1, 'rgba(10, 25, 41, 1)');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Línea de espuma en la cresta
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Crear partículas
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

    // Crear olas
    waves.push(new Wave(canvas.height * 0.7, 20, 0.01, 0.02));
    waves.push(new Wave(canvas.height * 0.75, 15, 0.015, -0.015));
    waves.push(new Wave(canvas.height * 0.8, 25, 0.008, 0.01));

    // Dibujar fondo degradado
    function drawBackground() {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      
      // Efecto parallax sutil basado en la posición del mouse
      const parallaxX = (mouseX / window.innerWidth - 0.5) * 20;
      const parallaxY = (mouseY / window.innerHeight - 0.5) * 20;
      
      gradient.addColorStop(0, `rgb(${15 + parallaxX}, ${23 + parallaxY}, 41)`);
      gradient.addColorStop(0.5, `rgb(${30 + parallaxX}, ${58 + parallaxY}, 102)`);
      gradient.addColorStop(1, `rgb(${12 + parallaxX}, ${74 + parallaxY}, 110)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Animar
    function animate() {
      drawBackground();

      // Actualizar y dibujar olas
      waves.forEach(wave => {
        wave.update();
        wave.draw();
      });

      // Actualizar y dibujar partículas
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }
});