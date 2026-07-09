import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { firebaseAuth, isFirebaseEnabled } from '../firebase/admin.js';
import { store } from '../store/index.js';

export type PapelUsuario = 'Administrador' | 'Consultor de vendas' | 'Cliente';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  const token = header.slice(7);

  if (store.kind === 'firestore' || isFirebaseEnabled()) {
    try {
      const decoded = await firebaseAuth().verifyIdToken(token);
      const perfil = await store.getUsuarioById(decoded.uid);
      req.user = {
        id: decoded.uid,
        email: decoded.email || perfil?.email || '',
        nome: perfil?.nome || decoded.name || decoded.email || '',
        papel: perfil?.papel || 'Consultor de vendas',
      };
      return next();
    } catch {
      // fallback JWT abaixo
    }
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

export function requirePapel(...papeis: PapelUsuario[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !papeis.includes(req.user.papel)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }
    next();
  };
}
