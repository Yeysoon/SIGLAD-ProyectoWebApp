window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const btnText = document.getElementById('btnText');
  
  // Mapeo de roles a la página de inicio
  const roleRedirectMap = {
    'ADMIN': '/usuarios.html',
    'TRANSPORTISTA': '/duca.html',
    'AGENTE': '/agente.html',
    'IMPORTADOR': '/importador.html'
  };
  
  const defaultPage = '/usuarios.html';

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
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      console.log('Respuesta login:', { 
        status: res.status, 
        ok: data.ok, 
        error: data.error
      });

      // [FA02] Usuario inactivo - Status 403
      if (res.status === 403) {
        mostrarMensaje('Usuario deshabilitado. Contacta al administrador.', 'error');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // [FA01] Credenciales inválidas - Status 401
      if (res.status === 401) {
        mostrarMensaje('Usuario o contraseña incorrecta', 'warning');
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        return;
      }

      // Status 400 - Validar el mensaje
      if (res.status === 400) {
        const mensajeError = data.error || 'Credenciales inválidas';
        
        // Si contiene "inactivo" o "deshabilitado" → es inactivo
        if (mensajeError.toLowerCase().includes('inactivo') || 
            mensajeError.toLowerCase().includes('deshabilitado')) {
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

  // Función para mostrar mensaje en el HTML
  function mostrarMensaje(texto, tipo = 'warning') {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success');
    
    let icono = 'fas fa-exclamation-triangle';
    if (tipo === 'error') icono = 'fas fa-times-circle';
    if (tipo === 'success') icono = 'fas fa-check-circle';
    if (tipo === 'warning') icono = 'fas fa-exclamation-triangle';
    
    msg.innerHTML = `<i class="fas ${icono}"></i> ${texto}`;
    msg.classList.add(tipo, 'show');
  }

  // Función para limpiar mensaje
  function limpiarMensaje() {
    msg.innerHTML = '';
    msg.classList.remove('show', 'error', 'warning', 'success');
  }

  // Permitir presionar Enter en los inputs
  document.getElementById('email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });
  
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });
});