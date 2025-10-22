import { Router } from 'express';
import { 
  authRequired, 
  transportistaOnly,
  agenteOnly,
} from '../middlewares/auth.js';
import { 
  recepcionDUCA,
  getPendingDeclarations, 
  validateDeclaration, 
  getMyDeclarationsStatus,
  getAllDeclarations  
} from '../controllers/duca.controller.js';

const router = Router();

// Solo autenticado + rol TRANSPORTISTA
router.post('/recepcion', authRequired, transportistaOnly, recepcionDUCA);

// 🚨 RUTAS PARA AGENTE
router.get('/declarations/pending', authRequired, agenteOnly, getPendingDeclarations);
router.get('/declarations/all', authRequired, agenteOnly, getAllDeclarations); // 🚨 NUEVA RUTA
router.post('/declarations/validate', authRequired, agenteOnly, validateDeclaration);

// Ruta para transportista
router.get('/declarations/status', authRequired, transportistaOnly, getMyDeclarationsStatus);

export default router;