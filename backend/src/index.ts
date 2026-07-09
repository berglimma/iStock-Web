import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { isFirestoreSync, store } from './store/index.js';
import authRoutes from './routes/auth.js';
import lancamentosRoutes from './routes/lancamentos.js';
import avaliacoesRoutes from './routes/avaliacoes.js';
import clientesRoutes from './routes/clientes.js';
import chatRoutes from './routes/chat.js';
import defeitosRoutes from './routes/defeitos.js';
import uploadRoutes from './routes/upload.js';
import assistenteRoutes from './routes/assistente.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Permite que `req.secure` funcione corretamente quando estiver atrás de proxy/ingress (Cloud Run, Container Apps, etc.)
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const APP_URL = process.env.APP_URL || 'https://www.istockbl.com.br';

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.istockbl.com.br',
  'https://istockbl.com.br',
];

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : defaultOrigins;

initDatabase();

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Força HTTPS para navegação (GET/HEAD) no ambiente de produção.
// Evita redirecionar POST/PUT/DELETE para não quebrar chamadas de API.
const enforceHttps = (process.env.ENFORCE_HTTPS || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
if (enforceHttps) {
  app.use((req, res, next) => {
    if (req.secure) return next();

    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (proto === 'https') return next();

    if (req.method === 'GET' || req.method === 'HEAD') {
      const host = req.headers.host;
      const target = new URL(req.originalUrl, `https://${host}`);
      return res.redirect(301, target.toString());
    }

    return next();
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) callback(null, true);
    else callback(new Error('CORS não permitido'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.use('/api/auth', authRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/defeitos', defeitosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/assistente', assistenteRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'iStock Web',
    version: '1.0.0',
    url: APP_URL,
    sync: store.kind,
    firebase: isFirestoreSync(),
  });
});

app.get('/api/sync/status', async (_req, res) => {
  if (!isFirestoreSync()) {
    return res.json({ ativo: false, modo: 'sqlite', mensagem: 'Modo local — sem sincronização com iOS' });
  }
  try {
    const { firebaseAuth, firestore } = await import('./firebase/admin.js');
    await firebaseAuth().listUsers(1);
    await firestore().collection('lancamentos').limit(1).get();
    res.json({
      ativo: true,
      modo: 'firestore',
      projectId: process.env.FIREBASE_PROJECT_ID || 'istock-4771d',
      databaseId: process.env.FIRESTORE_DATABASE_ID || 'istock',
      credenciais: true,
      mensagem: 'Sincronização ativa com o app iOS (modo Nuvem)',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const semBanco = msg.includes('NOT_FOUND');
    res.json({
      ativo: false,
      modo: 'firestore',
      projectId: process.env.FIREBASE_PROJECT_ID || 'istock-4771d',
      databaseId: process.env.FIRESTORE_DATABASE_ID || 'istock',
      credenciais: !semBanco,
      firestoreCriado: false,
      mensagem: semBanco
        ? 'Credenciais OK, mas o banco Firestore não foi encontrado. Verifique o ID do banco (FIRESTORE_DATABASE_ID).'
        : 'Falha na conexão com Firebase',
      erro: msg,
    });
  }
});

if (fs.existsSync(frontendDist)) {
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ iStock API rodando na porta ${PORT}`);
  console.log(`   Produção: ${APP_URL}`);
  console.log(`   Sincronização: ${store.kind}${isFirestoreSync() ? ' (mesmo Firestore do app iOS)' : ''}`);
});
