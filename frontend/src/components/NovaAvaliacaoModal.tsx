import { useState } from 'react';
import { api } from '../api/client';
import type { Avaliacao, ProblemaModelo } from '../types';
import { CartaoVidro } from './UI';
import {
  FormularioAvaliacao, dadosAvaliacaoVazio, podeSalvarAvaliacao,
  type DadosAvaliacaoForm,
} from './FormularioAvaliacao';

interface Props {
  onClose: () => void;
  onSalvo: () => void;
}

async function criarAvaliacaoComFotos(dados: DadosAvaliacaoForm, fotos: File[]) {
  const problemas = await api.defeitos.pesquisar(
    dados.tipoProduto, dados.modelo || undefined,
  ).then((r) => (r as { problemas: ProblemaModelo[] }).problemas);

  const base: Avaliacao = {
    tipoProduto: dados.tipoProduto,
    nome: dados.nome.trim(),
    modelo: dados.modelo || undefined,
    capacidade: dados.capacidade || undefined,
    cor: dados.cor || undefined,
    telefone: dados.telefone.trim(),
    serial: dados.serial || undefined,
    lacrado: dados.lacrado,
    condicaoPercentual: dados.lacrado ? undefined : dados.condicaoPercentual,
    observacoes: dados.observacoes || undefined,
    fotos: [],
    status: 'Em avaliação',
    pagamentoAprovado: false,
    data: new Date().toISOString(),
    problemasModelo: problemas,
  };

  const { id } = await api.avaliacoes.criar(base) as { id: string };
  const fotosSalvas = [];

  for (const file of fotos) {
    const ext = file.name.match(/\.\w+$/)?.[0] || '.jpg';
    const path = `avaliacoes/${id}/${crypto.randomUUID()}${ext}`;
    const up = await api.upload(file, path);
    fotosSalvas.push({ id: up.id, url: up.url, path: up.path });
  }

  await api.avaliacoes.atualizar(id, { ...base, id, fotos: fotosSalvas });
  return id;
}

export function NovaAvaliacaoModal({ onClose, onSalvo }: Props) {
  const [dados, setDados] = useState<DadosAvaliacaoForm>(dadosAvaliacaoVazio);
  const [fotos, setFotos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!podeSalvarAvaliacao(dados, fotos)) {
      setErro('Preencha nome, telefone e adicione ao menos uma foto.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await criarAvaliacaoComFotos(dados, fotos);
      onSalvo();
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar avaliação');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-grande" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 4 }}>Nova avaliação</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 20 }}>
          Envie fotos e dados do dispositivo Apple
        </p>

        <CartaoVidro>
          <FormularioAvaliacao
            dados={dados}
            onChange={setDados}
            fotos={fotos}
            onFotosChange={setFotos}
          />
        </CartaoVidro>

        {erro && <p style={{ color: '#ff3b30', fontSize: '0.85rem', marginTop: 12 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            className="btn-primario"
            style={{ width: 'auto', padding: '10px 24px' }}
            disabled={!podeSalvarAvaliacao(dados, fotos) || salvando}
            onClick={salvar}
          >
            {salvando ? 'Salvando...' : 'Enviar para avaliação'}
          </button>
          <button className="btn-secundario" onClick={onClose} disabled={salvando}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
