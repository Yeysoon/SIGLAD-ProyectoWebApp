import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ ok: false, error: 'Token requerido' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}

//Funcion mejorada.
export function roleRequired(allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user?.role; 
        
        if (!userRole) {
            return res.status(403).json({ ok: false, error: 'Información de rol no disponible.' });
        }

        const normalizedUserRole = userRole.toUpperCase();
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

        if (normalizedAllowedRoles.includes(normalizedUserRole)) {
            next();
        } else {
            res.status(403).json({ 
                ok: false, 
                error: `Acceso denegado. Solo ${allowedRoles.join(' ó ')} puede realizar esta acción.` 
            });
        }
    };
}

export const adminOnly = roleRequired(['ADMIN']);
export const transportistaOnly = roleRequired(['TRANSPORTISTA']);
export const agenteOnly = roleRequired(['AGENTE']); 
export const transportistaOrImportador = roleRequired(['TRANSPORTISTA', 'IMPORTADOR']);
//Funcion mejorada.


/* Se comenta por que no contamos con la flexibilidad para poder añadir mas roles por la funcion de arriba.

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ ok: false, error: 'Solo ADMIN puede realizar esta acción' });
  }
  next();
}

export function transportistaOnly(req, res, next) {
  if (req.user?.role !== 'TRANSPORTISTA') {
    return res.status(403).json({ ok: false, error: 'Solo TRANSPORTISTA puede realizar esta acción' });
  }
  next();
}*/
