import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pesquisarDefeitos, sugestoesModelo } from '../services/defeitosService.js';

const router = Router();

router.use(authMiddleware);

router.get('/sugestoes', (_req, res) => {
  res.json(sugestoesModelo);
});

router.post('/pesquisar', (req, res) => {
  const { tipo, modelo, numeracao } = req.body;
  res.json(pesquisarDefeitos(tipo, modelo, numeracao));
});

export default router;
