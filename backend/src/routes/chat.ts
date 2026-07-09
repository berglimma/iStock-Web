import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { store } from '../store/index.js';
import type { Mensagem } from '../types.js';

const router = Router();

router.use(authMiddleware);

router.get('/conversas', async (req, res) => {
  res.json(await store.listConversas(req.user!.id));
});

router.post('/conversas', async (req, res) => {
  const { clienteId, clienteNome } = req.body;

  const existente = await store.findConversaPorCliente(clienteId, req.user!.id);
  if (existente?.id) {
    return res.status(201).json({ id: existente.id });
  }

  const id = await store.createConversa({
    clienteId,
    clienteNome,
    vendedorId: req.user!.id,
    vendedorNome: req.user!.nome,
    participantes: [req.user!.id, clienteId],
  });
  res.status(201).json({ id });
});

router.get('/conversas/:id/mensagens', async (req, res) => {
  res.json(await store.listMensagens(req.params.id));
});

router.post('/conversas/:id/mensagens', async (req, res) => {
  const msg = req.body as Mensagem;
  const { id, data } = await store.createMensagem(req.params.id, {
    ...msg,
    conversaId: req.params.id,
    remetenteId: req.user!.id,
    remetenteNome: req.user!.nome,
  });
  await store.updateConversaUltimaMensagem(req.params.id, msg.texto ?? '[mídia]', data);
  res.status(201).json({ id, data });
});

export default router;
