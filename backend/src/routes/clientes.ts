import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { criadoPorLabel, store } from '../store/index.js';
import type { Cliente } from '../types.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  res.json(await store.listClientes());
});

router.post('/', async (req, res) => {
  const c = req.body as Cliente;
  const criadoPor = criadoPorLabel(req.user!.nome, req.user!.email);
  const id = await store.createCliente(c, criadoPor);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const c = req.body as Cliente;
  await store.updateCliente(req.params.id, c);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await store.deleteCliente(req.params.id);
  res.json({ ok: true });
});

export default router;
