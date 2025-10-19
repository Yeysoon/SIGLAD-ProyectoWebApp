import { Router } from 'express';
import { 
  authRequired, 
  transportistaOnly,
  agenteOnly,
  //transportistaOrImportador
} from '../middlewares/auth.js';
import { 
  recepcionDUCA,
  getPendingDeclarations, 
  validateDeclaration, 
  getMyDeclarationsStatus
} from '../controllers/duca.controller.js';

const router = Router();

// Solo autenticado + rol TRANSPORTISTA
router.post('/recepcion', authRequired, transportistaOnly, recepcionDUCA);

// Sección añadida
router.get('/declarations/pending', authRequired, agenteOnly, getPendingDeclarations);
router.post('/declarations/validate', authRequired, agenteOnly, validateDeclaration); // Cambiado de PATCH a POST
router.get('/declarations/status', authRequired, transportistaOnly, getMyDeclarationsStatus); // Cambiado de /my-declarations/status a /declarations/status

export default router;