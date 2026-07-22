import { buscarDefeitos } from './defeitosService.js';
import type { TipoProduto } from '../types.js';

interface ModeloCatalogo {
  chave: string;
  nome: string;
  destaques: string[];
  argumentos: string[];
}

const CATALOGO: ModeloCatalogo[] = [
  { chave: 'iphone 16 pro max', nome: 'iPhone 16 Pro Max', destaques: ['Tela 6,9"', 'A18 Pro', 'Titânio', 'Zoom avançado'], argumentos: ['Máxima autonomia', 'Melhor câmera para vídeo'] },
  { chave: 'iphone 16 pro', nome: 'iPhone 16 Pro', destaques: ['A18 Pro', 'Titânio', 'USB-C 3'], argumentos: ['Equilíbrio tamanho/performance', 'Câmera Pro'] },
  { chave: 'iphone 16', nome: 'iPhone 16', destaques: ['A18', '48 MP', 'USB-C'], argumentos: ['Geração atual com ótimo custo-benefício'] },
  { chave: 'iphone 15 pro max', nome: 'iPhone 15 Pro Max', destaques: ['A17 Pro', 'Zoom 5x', 'Titânio'], argumentos: ['Preço mais acessível que 16 Pro Max'] },
  { chave: 'iphone 15 pro', nome: 'iPhone 15 Pro', destaques: ['A17 Pro', 'Titânio', 'USB-C 3'], argumentos: ['Performance ainda muito atual'] },
  { chave: 'iphone 15', nome: 'iPhone 15', destaques: ['A16', '48 MP', 'USB-C'], argumentos: ['Salto grande vindo do 12/13'] },
  { chave: 'iphone 14 pro', nome: 'iPhone 14 Pro', destaques: ['Dynamic Island', 'A16', '48 MP'], argumentos: ['Pro com preço menor'] },
  { chave: 'iphone 13', nome: 'iPhone 13', destaques: ['A15', 'Ótima bateria'], argumentos: ['Entrada acessível e confiável'] },
  { chave: 'macbook pro', nome: 'MacBook Pro', destaques: ['Chip Apple Silicon', 'Tela Liquid Retina'], argumentos: ['Performance profissional', 'Bateria longa'] },
  { chave: 'macbook air', nome: 'MacBook Air', destaques: ['Ultraportátil', 'Silencioso'], argumentos: ['Ideal para estudo e produtividade'] },
  { chave: 'imac', nome: 'iMac', destaques: ['Tela grande', 'Design all-in-one'], argumentos: ['Setup limpo para casa/escritório'] },
  { chave: 'ipad pro', nome: 'iPad Pro', destaques: ['Apple Pencil', 'Tela ProMotion'], argumentos: ['Criação e produtividade'] },
  { chave: 'airpods pro', nome: 'AirPods Pro', destaques: ['ANC', 'Áudio espacial'], argumentos: ['Cancelamento de ruído premium'] },
];

function detectarModelos(texto: string): ModeloCatalogo[] {
  const t = texto.toLowerCase();
  return CATALOGO.filter((m) => t.includes(m.chave)).slice(0, 3);
}

function inferirTipo(modelo: string): TipoProduto {
  const m = modelo.toLowerCase();
  if (m.includes('iphone')) return 'iPhone';
  if (m.includes('macbook')) return 'MacBook';
  if (m.includes('imac') || m.includes('mac ')) return 'iMac';
  if (m.includes('ipad')) return 'iPad';
  if (m.includes('airpods')) return 'AirPods';
  if (m.includes('watch')) return 'Apple Watch';
  return 'Outro';
}

export function responderConsultorVendasLocal(
  pergunta: string,
  estoque: Array<{ nome: string; modelo?: string; valor: number; lacrado?: boolean }>,
): string {
  const texto = pergunta.trim();
  const modelos = detectarModelos(texto);
  if (!texto) {
    return [
      '**Consultor Apple — atendimento ao cliente**',
      '',
      'Pergunte sobre modelos, comparações ou o que oferecer ao cliente.',
      '',
      'Exemplos: "Compare iPhone 14 Pro e 15 Pro", "Cliente busca MacBook para faculdade".',
    ].join('\n');
  }

  const linhas: string[] = ['### Roteiro de vendas', ''];
  if (modelos.length) {
    for (const m of modelos) {
      linhas.push(`**${m.nome}**`);
      linhas.push(`• Destaques: ${m.destaques.join(' · ')}`);
      linhas.push(`• Argumentos: ${m.argumentos.join(' · ')}`);
      const noEstoque = estoque.find((e) => `${e.nome} ${e.modelo || ''}`.toLowerCase().includes(m.chave));
      if (noEstoque) {
        linhas.push(`• **Em estoque:** ${noEstoque.nome} — R$ ${noEstoque.valor.toFixed(0)}${noEstoque.lacrado ? ' (lacrado)' : ''}`);
      }
      linhas.push('');
    }
  } else if (estoque.length) {
    linhas.push('**Sugestões do estoque:**');
    for (const e of estoque.slice(0, 5)) {
      linhas.push(`• ${e.modelo || e.nome} — R$ ${e.valor.toFixed(0)}`);
    }
    linhas.push('');
  } else {
    linhas.push('Informe o modelo de interesse ou o perfil do cliente para montar o roteiro.');
  }

  linhas.push('💬 **Sugestão de fala**');
  linhas.push('"Esse modelo entrega o melhor equilíbrio entre desempenho e valor de revenda no ecossistema Apple."');
  return linhas.join('\n');
}

export function responderConsultorTecnicoLocal(pergunta: string): string {
  const texto = pergunta.trim();
  if (!texto) {
    return [
      '**Consultor Apple — suporte técnico**',
      '',
      'Descreva o modelo e o sintoma (ex.: "iPhone 13 aquecendo", "MacBook teclado travando").',
    ].join('\n');
  }

  const modelos = detectarModelos(texto);
  const tipo = modelos[0] ? inferirTipo(modelos[0].chave) : 'iPhone';
  const defeitos = buscarDefeitos(tipo, modelos[0]?.chave || texto);
  const linhas: string[] = ['### Diagnóstico técnico', ''];

  if (modelos[0]) {
    linhas.push(`**Modelo:** ${modelos[0].nome}`);
    linhas.push(`Destaques: ${modelos[0].destaques.join(' · ')}`);
    linhas.push('');
  }

  if (defeitos.length) {
    linhas.push('**Problemas conhecidos:**');
    for (const d of defeitos) {
      const emoji = d.gravidade === 'Alto' ? '🔴' : d.gravidade === 'Moderado' ? '🟡' : '🟢';
      linhas.push(`${emoji} **${d.titulo}** (${d.gravidade}): ${d.descricao}`);
    }
    linhas.push('');
  }

  linhas.push(
    '**Checklist rápido:**',
    '1. Saúde da bateria',
    '2. Peças desconhecidas em Ajustes',
    '3. Áudio, câmeras e Face ID/Touch ID',
    '4. iCloud deslogado',
    '5. Teste térmico curto',
  );
  return linhas.join('\n');
}
