import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { isFirestoreSync } from '../store/index.js';
import { firestore } from '../firebase/admin.js';
import { toIso, toTimestamp } from '../firebase/mappers.js';

const router = Router();
const MAX_FOTOS = 100;

router.use(authMiddleware);

export type ModeloFoto = {
  id: string;
  cadastroId: string;
  tipoProduto: string;
  fotoURL: string;
  fotoPath: string;
  data: string;
  criadoPor?: string;
};

router.get('/', async (req, res) => {
  const cadastroId = String(req.query.cadastroId || '').trim();
  if (!cadastroId) return res.status(400).json({ erro: 'cadastroId obrigatório' });

  if (isFirestoreSync()) {
    const snap = await firestore()
      .collection('modelo_fotos')
      .where('cadastroId', '==', cadastroId)
      .get();
    const fotos = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          cadastroId: data.cadastroId as string,
          tipoProduto: data.tipoProduto as string,
          fotoURL: data.fotoURL as string,
          fotoPath: data.fotoPath as string,
          data: toIso(data.data) || new Date().toISOString(),
          criadoPor: data.criadoPor as string | undefined,
        } satisfies ModeloFoto;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
    return res.json(fotos);
  }

  res.json([]);
});

router.post('/', async (req, res) => {
  const { cadastroId, tipoProduto, fotoURL, fotoPath } = req.body as {
    cadastroId?: string;
    tipoProduto?: string;
    fotoURL?: string;
    fotoPath?: string;
  };

  if (!cadastroId?.trim() || !tipoProduto?.trim() || !fotoURL?.trim() || !fotoPath?.trim()) {
    return res.status(400).json({ erro: 'cadastroId, tipoProduto, fotoURL e fotoPath são obrigatórios' });
  }

  if (isFirestoreSync()) {
    const existentes = await firestore()
      .collection('modelo_fotos')
      .where('cadastroId', '==', cadastroId.trim())
      .get();
    if (existentes.size >= MAX_FOTOS) {
      return res.status(400).json({ erro: `Limite de ${MAX_FOTOS} fotos atingido para este cadastro.` });
    }

    const ref = firestore().collection('modelo_fotos').doc();
    const doc = {
      cadastroId: cadastroId.trim(),
      tipoProduto: tipoProduto.trim(),
      fotoURL: fotoURL.trim(),
      fotoPath: fotoPath.trim(),
      data: toTimestamp(),
      criadoPor: req.user?.nome || req.user?.email || null,
    };
    await ref.set(doc);
    return res.status(201).json({
      id: ref.id,
      ...doc,
      data: new Date().toISOString(),
      criadoPor: doc.criadoPor || undefined,
    });
  }

  // Modo sqlite: metadados locais via upload path (sem coleção Firestore)
  const id = uuid();
  res.status(201).json({
    id,
    cadastroId: cadastroId.trim(),
    tipoProduto: tipoProduto.trim(),
    fotoURL: fotoURL.trim(),
    fotoPath: fotoPath.trim(),
    data: new Date().toISOString(),
    criadoPor: req.user?.nome || req.user?.email,
  });
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ erro: 'id obrigatório' });

  if (isFirestoreSync()) {
    const ref = firestore().collection('modelo_fotos').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ erro: 'Foto não encontrada' });
    await ref.delete();
    return res.json({ ok: true });
  }

  res.json({ ok: true });
});

export default router;
export { MAX_FOTOS as MAX_FOTOS_MODELO };
