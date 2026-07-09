import type { ProblemaModelo, TipoProduto } from '../types.js';

interface Entrada {
  padroes: string[];
  tipos?: TipoProduto[];
  problemas: ProblemaModelo[];
}

const base: Entrada[] = [
  { padroes: ['iphone 6 plus', '6 plus'], tipos: ['iPhone'], problemas: [
    { id: 'touch-disease', titulo: 'Touch Disease', descricao: 'Linha cinza no topo da tela e perda de toque por flexão da placa.', gravidade: 'Alto' },
    { id: 'bateria-6plus', titulo: 'Bateria inchada', descricao: 'Modelos antigos com risco de deformação da carcaça.', gravidade: 'Moderado' },
  ]},
  { padroes: ['iphone 6', 'iphone 6s'], tipos: ['iPhone'], problemas: [
    { id: 'touch-6', titulo: 'Falhas de toque', descricao: 'Solda da placa lógica pode causar toque intermitente.', gravidade: 'Alto' },
    { id: 'botao-6', titulo: 'Botão Home', descricao: 'Desgaste do botão Home em unidades muito usadas.', gravidade: 'Leve' },
  ]},
  { padroes: ['iphone x', 'iphone xs', 'iphone xs max'], tipos: ['iPhone'], problemas: [
    { id: 'boot-x', titulo: 'Boot loop', descricao: 'Algumas unidades reiniciam em loop após atualizações ou queda.', gravidade: 'Alto' },
    { id: 'oled-x', titulo: 'Burn-in OLED', descricao: 'Retenção de imagem em telas com uso prolongado.', gravidade: 'Moderado' },
  ]},
  { padroes: ['iphone 11'], tipos: ['iPhone'], problemas: [
    { id: 'tela-11', titulo: 'Troca de tela', descricao: 'Mensagem de peça desconhecida em telas não originais.', gravidade: 'Leve' },
    { id: 'audio-11', titulo: 'Microfone', descricao: 'Relatos de áudio abafado em chamadas em alguns lotes.', gravidade: 'Moderado' },
  ]},
  { padroes: ['iphone 12', 'iphone 12 mini'], tipos: ['iPhone'], problemas: [
    { id: '5g-12', titulo: 'Consumo 5G', descricao: 'Autonomia reduzida com 5G sempre ativo.', gravidade: 'Leve' },
    { id: 'tela-12', titulo: 'Peça de display', descricao: 'Verificar se há alerta de display não original.', gravidade: 'Moderado' },
  ]},
  { padroes: ['iphone 13'], tipos: ['iPhone'], problemas: [
    { id: 'pink-13', titulo: 'Tom rosado', descricao: 'Modelo rosa pode apresentar descoloração em algumas unidades.', gravidade: 'Leve' },
    { id: 'face-13', titulo: 'Face ID', descricao: 'Testar Face ID após queda ou troca de tela frontal.', gravidade: 'Moderado' },
  ]},
  { padroes: ['iphone 14 pro', 'iphone 14 pro max'], tipos: ['iPhone'], problemas: [
    { id: 'camera-14pro', titulo: 'Ruído na câmera', descricao: 'Algumas unidades apresentam chiado ao gravar vídeo.', gravidade: 'Moderado' },
    { id: 'always-14pro', titulo: 'Always-On', descricao: 'Consumo elevado com tela sempre ativa.', gravidade: 'Leve' },
  ]},
  { padroes: ['iphone 15 pro', 'iphone 15 pro max', 'iphone 15'], tipos: ['iPhone'], problemas: [
    { id: 'heat-15', titulo: 'Aquecimento', descricao: 'Primeiros lotes relataram aquecimento em jogos e carga rápida.', gravidade: 'Moderado' },
    { id: 'titanium-15', titulo: 'Acabamento titânio', descricao: 'Verificar riscos e quedas de tinta nas bordas.', gravidade: 'Leve' },
  ]},
  { padroes: ['iphone se'], tipos: ['iPhone'], problemas: [
    { id: 'bateria-se', titulo: 'Autonomia', descricao: 'Bateria pequena; desgaste acentuado em uso intenso.', gravidade: 'Moderado' },
    { id: 'touch-se', titulo: 'Touch ID', descricao: 'Botão Home integrado — verificar desgaste e umidade.', gravidade: 'Moderado' },
  ]},
  { padroes: ['ipad pro'], tipos: ['iPad'], problemas: [
    { id: 'bend-ipad', titulo: 'Flexão da carcaça', descricao: 'Modelos finos podem entortar em mochilas apertadas.', gravidade: 'Moderado' },
    { id: 'pencil-ipad', titulo: 'Apple Pencil', descricao: 'Confirmar geração compatível do Pencil.', gravidade: 'Leve' },
  ]},
  { padroes: ['macbook pro'], tipos: ['MacBook'], problemas: [
    { id: 'keyboard-butterfly', titulo: 'Teclado butterfly', descricao: 'Modelos 2016–2019: teclas travando ou repetindo.', gravidade: 'Alto' },
    { id: 'flexgate', titulo: 'Flexgate', descricao: 'Cabo da tela pode falhar — brilho irregular ou apagão.', gravidade: 'Alto' },
    { id: 'bateria-mbp', titulo: 'Bateria', descricao: 'Verificar ciclos e inchamento em modelos antigos.', gravidade: 'Moderado' },
  ]},
  { padroes: ['macbook air'], tipos: ['MacBook'], problemas: [
    { id: 'fan-air', titulo: 'Ventoinha', descricao: 'Modelos Intel podem ficar ruidosos com poeira.', gravidade: 'Leve' },
    { id: 'm1-air', titulo: 'M1/M2', descricao: 'Sem ventoinha — monitorar thermal throttling em cargas longas.', gravidade: 'Leve' },
  ]},
  { padroes: ['airpods pro'], tipos: ['AirPods'], problemas: [
    { id: 'crackle-app', titulo: 'Chiado / estalo', descricao: 'Programa de substituição Apple para unidades até out/2020.', gravidade: 'Alto' },
    { id: 'anc-app', titulo: 'ANC enfraquecido', descricao: 'Cancelamento de ruído pode degradar com o tempo.', gravidade: 'Moderado' },
  ]},
  { padroes: ['airpods'], tipos: ['AirPods'], problemas: [
    { id: 'bateria-ap', titulo: 'Bateria dos fones', descricao: 'Autonomia cai bastante após 2–3 anos de uso.', gravidade: 'Moderado' },
    { id: 'case-ap', titulo: 'Case', descricao: 'Verificar se o case carrega e pareia corretamente.', gravidade: 'Leve' },
  ]},
  { padroes: ['apple watch'], tipos: ['Apple Watch', 'Watch'], problemas: [
    { id: 'screen-watch', titulo: 'Tela', descricao: 'Verificar riscos e touch após impactos.', gravidade: 'Moderado' },
    { id: 'digital-crown', titulo: 'Digital Crown', descricao: 'Coroa pode endurecer com sujeira ou umidade.', gravidade: 'Leve' },
  ]},
  { padroes: ['apple tv'], tipos: ['Apple TV'], problemas: [
    { id: 'remote-atv', titulo: 'Controle remoto', descricao: 'Verificar botões e bateria do Siri Remote.', gravidade: 'Leve' },
    { id: 'hdmi-atv', titulo: 'HDMI / rede', descricao: 'Testar saída 4K e conexão Wi‑Fi estável.', gravidade: 'Moderado' },
  ]},
  { padroes: ['magic mouse'], tipos: ['Magic Mouse'], problemas: [
    { id: 'scroll-mouse', titulo: 'Scroll', descricao: 'Superfície de scroll pode falhar com desgaste.', gravidade: 'Moderado' },
    { id: 'charge-mouse', titulo: 'Carga inferior', descricao: 'Modelo Lightning não pode ser usado durante a carga.', gravidade: 'Leve' },
  ]},
];

const mapeamentoNumeracao: Record<string, { nome: string; tipo: TipoProduto }> = {
  A2849: { nome: 'iPhone 15 Pro Max', tipo: 'iPhone' },
  A2848: { nome: 'iPhone 15 Pro', tipo: 'iPhone' },
  A2846: { nome: 'iPhone 15', tipo: 'iPhone' },
  A2651: { nome: 'iPhone 14 Pro Max', tipo: 'iPhone' },
  A2650: { nome: 'iPhone 14 Pro', tipo: 'iPhone' },
  A2482: { nome: 'iPhone 13', tipo: 'iPhone' },
  A2403: { nome: 'iPhone 12', tipo: 'iPhone' },
  A2221: { nome: 'iPhone 11', tipo: 'iPhone' },
  A1865: { nome: 'iPhone X', tipo: 'iPhone' },
  A2595: { nome: 'iPhone SE', tipo: 'iPhone' },
  A2918: { nome: 'MacBook Pro 14', tipo: 'MacBook' },
  A2681: { nome: 'MacBook Air', tipo: 'MacBook' },
  A2931: { nome: 'AirPods Pro', tipo: 'AirPods' },
};

function problemasGenericos(tipo: TipoProduto): ProblemaModelo[] {
  if (['iPhone', 'iPad'].includes(tipo)) {
    return [
      { id: 'gen-bateria', titulo: 'Bateria', descricao: 'Verificar saúde da bateria e ciclos de carga.', gravidade: 'Moderado' },
      { id: 'gen-tela', titulo: 'Tela e Face ID', descricao: 'Testar display, toque e biometria após quedas.', gravidade: 'Moderado' },
    ];
  }
  if (['MacBook', 'Mac'].includes(tipo)) {
    return [
      { id: 'gen-ssd', titulo: 'Armazenamento', descricao: 'Rodar diagnóstico de disco e SMART se disponível.', gravidade: 'Moderado' },
      { id: 'gen-teclado', titulo: 'Teclado e trackpad', descricao: 'Testar todas as teclas e cliques.', gravidade: 'Leve' },
    ];
  }
  if (tipo === 'AirPods') {
    return [{ id: 'gen-ap', titulo: 'Áudio e bateria', descricao: 'Ouvir chiados e testar autonomia real dos fones.', gravidade: 'Moderado' }];
  }
  return [{ id: 'gen-geral', titulo: 'Inspeção geral', descricao: 'Testar funções principais, portas e conectividade.', gravidade: 'Leve' }];
}

export function buscarDefeitos(tipo: TipoProduto, modelo?: string): ProblemaModelo[] {
  if (!modelo?.trim()) return [];
  const texto = modelo.toLowerCase();
  const encontrados: ProblemaModelo[] = [];
  const ids = new Set<string>();

  for (const entrada of base) {
    if (entrada.tipos && !entrada.tipos.includes(tipo)) continue;
    const combina = entrada.padroes.some((p) => texto.includes(p) || p.includes(texto));
    if (!combina) continue;
    for (const p of entrada.problemas) {
      if (!ids.has(p.id)) { ids.add(p.id); encontrados.push(p); }
    }
  }

  return encontrados.length ? encontrados.sort((a, b) => b.gravidade.localeCompare(a.gravidade)) : problemasGenericos(tipo);
}

export function pesquisarDefeitos(tipo?: TipoProduto, modelo?: string, numeracao?: string) {
  let tipoResolvido = tipo ?? 'iPhone';
  let nomeModelo = modelo?.trim() || undefined;
  let codigoResolvido: string | undefined;

  if (numeracao?.trim()) {
    const codigo = normalizarNumeracao(numeracao);
    const mapeado = mapeamentoNumeracao[codigo];
    if (mapeado) {
      codigoResolvido = codigo;
      nomeModelo = nomeModelo ?? mapeado.nome;
      tipoResolvido = mapeado.tipo;
    } else if (codigo.startsWith('A') && codigo.length >= 4) {
      codigoResolvido = codigo;
    }
  }

  let problemas = nomeModelo ? buscarDefeitos(tipoResolvido, nomeModelo) : [];
  if (!problemas.length) problemas = problemasGenericos(tipoResolvido);

  return {
    modeloIdentificado: nomeModelo ?? null,
    numeracaoIdentificada: codigoResolvido ?? numeracao ?? null,
    tipoProduto: tipoResolvido,
    problemas,
    encontrouCorrespondencia: Boolean(nomeModelo || codigoResolvido),
  };
}

function normalizarNumeracao(texto: string): string {
  const limpo = texto.toUpperCase().replace(/\s/g, '');
  const match = limpo.match(/A\d{4}/);
  return match ? match[0] : limpo;
}

export const sugestoesModelo = [
  'iPhone 15 Pro', 'iPhone 14 Pro', 'iPhone 13', 'iPhone 11', 'iPhone X',
  'MacBook Pro', 'AirPods Pro', 'Apple Watch',
];
