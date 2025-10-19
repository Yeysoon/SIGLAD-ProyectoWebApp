window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  
  // Mapeo de roles a la página de inicio correspondiente
  const roleRedirectMap = {
    'ADMIN': '/usuarios.html',
    'TRANSPORTISTA': '/duca.html',
    'AGENTE': '/agente.html', // <-- Redirección directa para el Agente
  };
  
  // Página por defecto (Fallback) si el rol no está mapeado
  const defaultPage = '/index.html'; 

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        msg.textContent = data?.error || 'Usuario o contraseña incorrecta';
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const role = data.user?.role;
      
      // Determina la URL de redirección usando el mapa o la página por defecto
      const redirectURL = roleRedirectMap[role] || defaultPage;
      
      location.replace(redirectURL);

    } catch (err) {
     msg.textContent = 'No se pudo conectar. Intenta de nuevo.';
    }
  });
});




/*window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        msg.textContent = data?.error || 'Usuario o contraseña incorrecta';
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const role = data.user?.role;
      if (role === 'ADMIN') {
        location.replace('/usuarios.html');
      } else if (role === 'TRANSPORTISTA') {
        location.replace('/duca.html');
      } else if (role === 'AGENTE') { 
        location.replace('/agente.html');
      }
      else {
        // fallback: elige la landing que prefieras para otros roles
        location.replace('/usuarios.html');
      }
    } catch (err) {
      msg.textContent = 'No se pudo conectar. Intenta de nuevo.';
    }
  });
});*/
