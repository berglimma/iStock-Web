import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { firebaseAuth } from '../firebase/admin.js';
import { signToken, authMiddleware, PapelUsuario } from '../middleware/auth.js';
import { atualizarContadorAdministradores } from '../services/transacaoLogService.js';
import { isFirestoreSync, store } from '../store/index.js';

const router = Router();
const MAX_ADMINS = 4;

router.get('/config', (_req, res) => {
  res.json({
    sync: store.kind,
    firebase: isFirestoreSync(),
    projectId: process.env.FIREBASE_PROJECT_ID || (isFirestoreSync() ? 'istock-4771d' : null),
    databaseId: isFirestoreSync() ? (process.env.FIRESTORE_DATABASE_ID || 'istock') : null,
  });
});

router.post('/firebase', async (req, res) => {
  if (!isFirestoreSync()) {
    return res.status(400).json({ erro: 'Sincronização Firebase não está ativa' });
  }

  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ erro: 'Token Firebase obrigatório' });

  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    let perfil = await store.getUsuarioById(decoded.uid);

    if (!perfil) {
      const fbUser = await firebaseAuth().getUser(decoded.uid);
      const email = (fbUser.email || decoded.email || '').toLowerCase().trim();
      if (!email) {
        return res.status(400).json({ erro: 'Conta Google sem e-mail. Use outro método de login.' });
      }
      const nome = fbUser.displayName?.trim() || email.split('@')[0] || 'Usuário';
      await store.createUsuario({
        id: decoded.uid,
        nome,
        email,
        papel: 'Consultor de vendas',
        dataCadastro: new Date().toISOString(),
      });
      perfil = await store.getUsuarioById(decoded.uid);
    }

    if (!perfil) {
      return res.status(404).json({ erro: 'Perfil não encontrado. Complete o cadastro.' });
    }
    res.json({
      token: idToken,
      usuario: { id: decoded.uid, nome: perfil.nome, email: perfil.email, papel: perfil.papel },
    });
  } catch {
    res.status(401).json({ erro: 'Token Firebase inválido' });
  }
});

router.post('/login', async (req, res) => {
  if (isFirestoreSync()) {
    return res.status(400).json({
      erro: 'Use login Firebase na web para sincronizar com o app iOS',
      code: 'FIREBASE_REQUIRED',
      firebase: true,
    });
  }

  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

  const user = await store.getUsuarioByEmail(email);
  if (!user?.senhaHash || !bcrypt.compareSync(senha, user.senhaHash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  }

  const token = signToken({ id: user.id, email: user.email, nome: user.nome, papel: user.papel });
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, papel: user.papel } });
});

router.post('/cadastro', async (req, res) => {
  const { nome, email, senha, papel, idToken } = req.body as {
    nome: string;
    email: string;
    senha?: string;
    papel: PapelUsuario;
    idToken?: string;
  };

  if (!nome?.trim() || !email?.trim()) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }

  const emailLimpo = email.toLowerCase().trim();
  const existente = await store.getUsuarioByEmail(emailLimpo);
  if (existente) return res.status(409).json({ erro: 'Esse e-mail já está cadastrado' });

  if (papel === 'Administrador') {
    const admins = await store.countAdministradores();
    if (admins >= MAX_ADMINS) {
      return res.status(400).json({ erro: 'Limite de 4 administradores atingido' });
    }
  }

  if (isFirestoreSync()) {
    if (!idToken) return res.status(400).json({ erro: 'Conta Firebase obrigatória para cadastro' });
    try {
      const decoded = await firebaseAuth().verifyIdToken(idToken);
      await store.createUsuario({
        id: decoded.uid,
        nome: nome.trim(),
        email: emailLimpo,
        papel: papel || 'Consultor de vendas',
        dataCadastro: new Date().toISOString(),
      });
      await atualizarContadorAdministradores();
      res.status(201).json({
        token: idToken,
        usuario: { id: decoded.uid, nome: nome.trim(), email: emailLimpo, papel: papel || 'Consultor de vendas' },
      });
      return;
    } catch {
      return res.status(401).json({ erro: 'Token Firebase inválido' });
    }
  }

  if (!senha || senha.length < 6) return res.status(400).json({ erro: 'Senha muito fraca (mínimo 6 caracteres)' });

  const id = uuid();
  const hash = bcrypt.hashSync(senha, 10);
  await store.createUsuario({
    id,
    nome: nome.trim(),
    email: emailLimpo,
    senhaHash: hash,
    papel: papel || 'Consultor de vendas',
    dataCadastro: new Date().toISOString(),
  });

  const token = signToken({ id, email: emailLimpo, nome: nome.trim(), papel: papel || 'Consultor de vendas' });
  res.status(201).json({ token, usuario: { id, nome: nome.trim(), email: emailLimpo, papel } });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.user });
});

router.get('/admin-disponivel', async (_req, res) => {
  const admins = await store.countAdministradores();
  res.json({ disponivel: admins < MAX_ADMINS });
});

router.delete('/conta', authMiddleware, async (req, res) => {
  const uid = req.user!.id;

  if (isFirestoreSync()) {
    try {
      await store.deleteUsuario(uid);
      await atualizarContadorAdministradores();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ erro: `Falha ao remover perfil na nuvem: ${msg}` });
    }

    let authRemovido = false;
    try {
      await firebaseAuth().deleteUser(uid);
      authRemovido = true;
    } catch (err) {
      // O client também tenta user.delete() após reauth — não bloqueia se já foi removido.
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/user-not-found') authRemovido = true;
    }

    return res.json({
      ok: true,
      nuvem: true,
      perfilRemovido: true,
      authRemovido,
      mensagem: 'Conta removida da nuvem (Firestore + Authentication).',
    });
  }

  const { senha } = req.body as { senha?: string };
  const user = await store.getUsuarioById(uid);
  if (!user?.senhaHash || !senha || !bcrypt.compareSync(senha, user.senhaHash)) {
    return res.status(401).json({ erro: 'Senha incorreta' });
  }
  await store.deleteUsuario(uid);
  res.json({ ok: true, nuvem: false, perfilRemovido: true });
});

export default router;
