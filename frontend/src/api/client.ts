import { getFirebaseAuth, isFirebaseConfigured, refreshIdToken } from '../firebase/auth';

const API = '/api';

function getToken() {
  return localStorage.getItem('istock_token');
}

async function resolveAuthToken(): Promise<string | null> {
  if (isFirebaseConfigured()) {
    const user = getFirebaseAuth().currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        localStorage.setItem('istock_token', token);
        return token;
      } catch {
        // usa token em cache abaixo
      }
    }
  }
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  const token = await resolveAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !retried && isFirebaseConfigured()) {
    const fresh = await refreshIdToken();
    if (fresh) {
      localStorage.setItem('istock_token', fresh);
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data as T;
}

export const api = {
  config: () => request<{ sync: string; firebase: boolean; projectId: string | null }>('/auth/config'),
  firebaseSession: (idToken: string) =>
    request<{ token: string; usuario: import('../types').Usuario }>('/auth/firebase', {
      method: 'POST', body: JSON.stringify({ idToken }),
    }),
  login: (email: string, senha: string) =>
    request<{ token: string; usuario: import('../types').Usuario }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, senha }),
    }),
  cadastro: (dados: { nome: string; email: string; senha?: string; papel: string; idToken?: string }) =>
    request<{ token: string; usuario: import('../types').Usuario }>('/auth/cadastro', {
      method: 'POST', body: JSON.stringify(dados),
    }),
  me: () => request<{ usuario: import('../types').Usuario }>('/auth/me'),
  adminDisponivel: () => request<{ disponivel: boolean }>('/auth/admin-disponivel'),
  excluirConta: (senha: string) =>
    request('/auth/conta', { method: 'DELETE', body: JSON.stringify({ senha }) }),

  lancamentos: {
    listar: () => request<import('../types').Lancamento[]>('/lancamentos'),
    metricas: () => request<Record<string, number>>('/lancamentos/metricas'),
    criar: (d: import('../types').Lancamento) =>
      request('/lancamentos', { method: 'POST', body: JSON.stringify(d) }),
    atualizar: (id: string, d: import('../types').Lancamento) =>
      request(`/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    excluir: (id: string) => request(`/lancamentos/${id}`, { method: 'DELETE' }),
  },

  avaliacoes: {
    listar: () => request<import('../types').Avaliacao[]>('/avaliacoes'),
    metricas: () => request<Record<string, number>>('/avaliacoes/metricas'),
    criar: (d: import('../types').Avaliacao) =>
      request('/avaliacoes', { method: 'POST', body: JSON.stringify(d) }),
    avaliar: (id: string) => request(`/avaliacoes/${id}/avaliar`, { method: 'POST' }),
    aprovar: (id: string) => request(`/avaliacoes/${id}/aprovar`, { method: 'POST' }),
    recusar: (id: string, justificativa: string) =>
      request(`/avaliacoes/${id}/recusar`, { method: 'POST', body: JSON.stringify({ justificativa }) }),
    aprovarPagamento: (id: string) => request(`/avaliacoes/${id}/aprovar-pagamento`, { method: 'POST' }),
    paraEstoque: (id: string) => request(`/avaliacoes/${id}/estoque`, { method: 'POST' }),
    registrarValorReal: (id: string, valor: number) =>
      request(`/avaliacoes/${id}/valor-real`, { method: 'POST', body: JSON.stringify({ valor }) }),
    registrarRetirada: (id: string, dados: import('../types').RetiradaProduto) =>
      request(`/avaliacoes/${id}/retirada`, { method: 'POST', body: JSON.stringify(dados) }),
    atualizar: (id: string, d: import('../types').Avaliacao) =>
      request(`/avaliacoes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    excluir: (id: string) => request(`/avaliacoes/${id}`, { method: 'DELETE' }),
  },

  clientes: {
    listar: () => request<import('../types').Cliente[]>('/clientes'),
    criar: (d: import('../types').Cliente) =>
      request('/clientes', { method: 'POST', body: JSON.stringify(d) }),
    atualizar: (id: string, d: import('../types').Cliente) =>
      request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    excluir: (id: string) => request(`/clientes/${id}`, { method: 'DELETE' }),
  },

  chat: {
    conversas: () => request<import('../types').Conversa[]>('/chat/conversas'),
    criarConversa: (clienteId: string, clienteNome: string) =>
      request('/chat/conversas', { method: 'POST', body: JSON.stringify({ clienteId, clienteNome }) }),
    mensagens: (conversaId: string) =>
      request<import('../types').Mensagem[]>(`/chat/conversas/${conversaId}/mensagens`),
    enviar: (conversaId: string, texto: string) =>
      request(`/chat/conversas/${conversaId}/mensagens`, {
        method: 'POST', body: JSON.stringify({ tipo: 'texto', texto }),
      }),
  },

  defeitos: {
    sugestoes: () => request<string[]>('/defeitos/sugestoes'),
    pesquisar: (tipo?: string, modelo?: string, numeracao?: string) =>
      request('/defeitos/pesquisar', {
        method: 'POST', body: JSON.stringify({ tipo, modelo, numeracao }),
      }),
  },

  upload: async (file: File, storagePath?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (storagePath) fd.append('path', storagePath);
    return request<{ id: string; url: string; path: string }>('/upload', { method: 'POST', body: fd });
  },

  assistente: {
    criterios: () => request<{ criterios: import('../types').CriteriosAssistente | null }>('/assistente/criterios'),
    salvarCriterios: (d: Partial<import('../types').CriteriosAssistente>) =>
      request<{ criterios: import('../types').CriteriosAssistente }>('/assistente/criterios', {
        method: 'PUT', body: JSON.stringify(d),
      }),
    sessoes: (modo?: string) =>
      request<import('../types').SessaoAssistente[]>(`/assistente/sessoes${modo ? `?modo=${modo}` : ''}`),
    criarSessao: (modo: import('../types').ModoAssistente, titulo?: string) =>
      request<import('../types').SessaoAssistente>('/assistente/sessoes', {
        method: 'POST', body: JSON.stringify({ modo, titulo }),
      }),
    mensagens: (sessaoId: string) =>
      request<import('../types').MensagemAssistente[]>(`/assistente/sessoes/${sessaoId}/mensagens`),
    enviar: (sessaoId: string, conteudo: string) =>
      request<{ usuario: import('../types').MensagemAssistente; assistente: import('../types').MensagemAssistente }>(
        `/assistente/sessoes/${sessaoId}/mensagens`,
        { method: 'POST', body: JSON.stringify({ conteudo }) },
      ),
    excluirSessao: (sessaoId: string) =>
      request(`/assistente/sessoes/${sessaoId}`, { method: 'DELETE' }),
  },
};

export function brl(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function dataCompleta(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}
