import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { isFirestoreSync, store } from '../store/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const router = Router();

router.use(authMiddleware);

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Arquivo obrigatório' });

  const customPath = typeof req.body.path === 'string' ? req.body.path.trim() : '';
  const pasta = (req.body.pasta as string) || 'cadastros';
  const ext = path.extname(req.file.originalname) || '.jpg';
  const storagePath = customPath || `${pasta}/${uuid()}${ext}`;

  if (isFirestoreSync()) {
    const { url, path: p } = await store.uploadFile(
      req.file.buffer,
      storagePath,
      req.file.mimetype || 'image/jpeg',
    );
    return res.json({ id: uuid(), url, path: p });
  }

  const fs = await import('fs');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const localPath = path.join(uploadDir, storagePath);
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(localPath, req.file.buffer);
  res.json({ id: uuid(), url: `/uploads/${storagePath}`, path: localPath });
});

export default router;
