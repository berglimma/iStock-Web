import { useRef, useState, FormEvent, type ReactNode } from 'react';
import {
  Tag, Smartphone, HardDrive, Palette, Phone, Barcode,
  StickyNote, Monitor, Watch, Tablet, Laptop, Headphones,
  Tv, Mouse, Music, Package, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { api, brl } from '../api/client';
import {
  TIPOS_PRODUTO, TIPOS_COM_CAPACIDADE, TIPOS_COM_BATERIA,
  type ModeloFoto, type TipoProduto,
} from '../types';
import { TituloTela, CartaoVidro, CampoApp } from '../components/UI';

const MAX_FOTOS = 100;

const ICONES_TIPO: Record<TipoProduto, ReactNode> = {
  iPhone: <Smartphone size={26} />,
  iMac: <Monitor size={26} />,
  Watch: <Watch size={26} />,
  iPad: <Tablet size={26} />,
  'Apple Watch': <Watch size={26} />,
  MacBook: <Laptop size={26} />,
  AirPods: <Headphones size={26} />,
  'Apple TV': <Tv size={26} />,
  'Magic Mouse': <Mouse size={26} />,
  iPod: <Music size={26} />,
  Outro: <Package size={26} />,
};

const formVazio = () => ({
  tipo: 'iPhone' as TipoProduto,
  nome: '',
  modelo: '',
  capacidade: '',
  cor: '',
  telefone: '',
  serial: '',
  lacrado: false,
  condicao: 100,
  custo: '',
  valor: '',
  obs: '',
});

const novoCadastroId = () => crypto.randomUUID();

export default function CadastroPage() {
  const [form, setForm] = useState(formVazio);
  const [cadastroId, setCadastroId] = useState(novoCadastroId);
  const [fotos, setFotos] = useState<ModeloFoto[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const custoNum = Number(form.custo) || 0;
  const valorNum = Number(form.valor) || 0;
  const margem = valorNum - custoNum;
  const margemPct = custoNum > 0 ? (margem / custoNum) * 100 : 0;
  const podeAdicionarFoto = fotos.length < MAX_FOTOS;

  const valido =
    Boolean(form.nome.trim()) &&
    Boolean(form.telefone.trim()) &&
    valorNum > 0;

  const adicionarFotos = async (files: FileList | null) => {
    if (!files?.length || !podeAdicionarFoto) return;
    setErro('');
    setEnviandoFoto(true);
    try {
      const restantes = MAX_FOTOS - fotos.length;
      const lista = Array.from(files).slice(0, restantes);
      const novas: ModeloFoto[] = [];
      for (const file of lista) {
        const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '.jpg';
        const path = `cadastros/${cadastroId}/${crypto.randomUUID()}${ext}`;
        const up = await api.upload(file, path);
        const meta = await api.modeloFotos.criar({
          cadastroId,
          tipoProduto: form.tipo,
          fotoURL: up.url,
          fotoPath: up.path,
        });
        novas.push(meta);
      }
      setFotos((prev) => [...novas, ...prev]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar foto');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const removerFoto = async (foto: ModeloFoto) => {
    setErro('');
    try {
      await api.modeloFotos.excluir(foto.id);
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover foto');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || salvando) return;
    setErro('');
    setSalvando(true);
    try {
      await api.lancamentos.criar({
        id: cadastroId,
        nome: form.nome.trim(),
        tipoProduto: form.tipo,
        modelo: form.modelo.trim() || undefined,
        capacidade: form.capacidade.trim() || undefined,
        cor: form.cor.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        serial: form.serial.trim() || undefined,
        lacrado: form.lacrado,
        condicaoPercentual: form.lacrado ? undefined : form.condicao,
        custoCompra: custoNum > 0 ? custoNum : undefined,
        valor: valorNum,
        status: 'Disponível',
        data: new Date().toISOString(),
        observacoes: form.obs.trim() || undefined,
      });
      setSucesso(true);
      setForm(formVazio());
      setCadastroId(novoCadastroId());
      setFotos([]);
      setTimeout(() => setSucesso(false), 1500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="cadastro-page">
      <TituloTela
        titulo="Cadastrar Produto"
        subtitulo="Adicione um novo item ao estoque Apple"
      />
      <CartaoVidro>
        <form onSubmit={handleSubmit} className="form-grid cadastro-form">
          <div className="tipo-card-grid" role="group" aria-label="Tipo de produto">
            {TIPOS_PRODUTO.map((t) => {
              const ativo = form.tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  className={`tipo-card ${ativo ? 'active' : ''}`}
                  onClick={() => set('tipo', t)}
                >
                  <span className="tipo-card__icone">{ICONES_TIPO[t]}</span>
                  <span className="tipo-card__nome">{t}</span>
                </button>
              );
            })}
          </div>

          <div className="galeria-modelo">
            <div className="galeria-modelo__topo">
              <div>
                <h4>Fotos do cadastro</h4>
                <p>{form.tipo}</p>
              </div>
              <span className={`galeria-modelo__contagem ${!podeAdicionarFoto ? 'limite' : ''}`}>
                {fotos.length}/{MAX_FOTOS}
              </span>
            </div>

            {!podeAdicionarFoto ? (
              <p className="galeria-modelo__aviso">
                Limite de {MAX_FOTOS} fotos atingido para este cadastro.
              </p>
            ) : fotos.length === 0 && !enviandoFoto ? (
              <p className="galeria-modelo__vazio">Nenhuma foto adicionada neste cadastro.</p>
            ) : null}

            <div className="fotos-grid">
              {fotos.map((foto) => (
                <div key={foto.id} className="foto-thumb">
                  <img src={foto.fotoURL} alt="" />
                  <button
                    type="button"
                    className="foto-remover"
                    onClick={() => void removerFoto(foto)}
                    aria-label="Remover foto"
                  >
                    ×
                  </button>
                </div>
              ))}
              {podeAdicionarFoto && (
                <button
                  type="button"
                  className="foto-add"
                  disabled={enviandoFoto}
                  onClick={() => inputFoto.current?.click()}
                >
                  <span>+</span>
                  <span>{enviandoFoto ? 'Enviando...' : 'Adicionar'}</span>
                </button>
              )}
            </div>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void adicionarFotos(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          <CampoApp
            icone={<Tag size={18} color="#73b8ff" />}
            placeholder="Nome / descrição"
            value={form.nome}
            onChange={(v) => set('nome', v)}
          />
          <CampoApp
            icone={<Smartphone size={18} color="#73b8ff" />}
            placeholder="Modelo (ex: iPhone 15 Pro)"
            value={form.modelo}
            onChange={(v) => set('modelo', v)}
          />

          {TIPOS_COM_CAPACIDADE.includes(form.tipo) && (
            <CampoApp
              icone={<HardDrive size={18} color="#73b8ff" />}
              placeholder="Capacidade (ex: 256GB)"
              value={form.capacidade}
              onChange={(v) => set('capacidade', v)}
            />
          )}

          <CampoApp
            icone={<Palette size={18} color="#73b8ff" />}
            placeholder="Cor"
            value={form.cor}
            onChange={(v) => set('cor', v)}
          />
          <CampoApp
            icone={<Phone size={18} color="#73b8ff" />}
            placeholder="Contato telefônico"
            value={form.telefone}
            onChange={(v) => set('telefone', v)}
          />
          <CampoApp
            icone={<Barcode size={18} color="#73b8ff" />}
            placeholder="Nº serial / IMEI"
            value={form.serial}
            onChange={(v) => set('serial', v)}
          />

          <label className="cadastro-toggle">
            <input
              type="checkbox"
              checked={form.lacrado}
              onChange={(e) => set('lacrado', e.target.checked)}
            />
            <span>Lacrado (novo)</span>
          </label>

          {!form.lacrado && TIPOS_COM_BATERIA.includes(form.tipo) && (
            <div className="cadastro-bateria">
              <p>Saúde da bateria: {form.condicao}%</p>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={form.condicao}
                onChange={(e) => set('condicao', Number(e.target.value))}
              />
            </div>
          )}

          <div className="cadastro-moeda">
            <span>Custo de compra</span>
            <div className="campo-app">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="R$ 0,00"
                value={form.custo}
                onChange={(e) => set('custo', e.target.value)}
              />
            </div>
          </div>

          <div className="cadastro-moeda">
            <span>Preço de venda</span>
            <div className="campo-app">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="R$ 0,00"
                value={form.valor}
                onChange={(e) => set('valor', e.target.value)}
                required
              />
            </div>
          </div>

          {custoNum > 0 && valorNum > 0 && (
            <p className={`cadastro-margem ${margem >= 0 ? 'ok' : 'neg'}`}>
              <TrendingUp size={14} />
              Margem: {brl(margem)} ({margemPct.toFixed(0)}%)
            </p>
          )}

          <CampoApp
            icone={<StickyNote size={18} color="#73b8ff" />}
            placeholder="Observações"
            value={form.obs}
            onChange={(v) => set('obs', v)}
            as="textarea"
          />

          {erro && <p className="cadastro-erro">{erro}</p>}
          {sucesso && (
            <p className="cadastro-ok">
              <CheckCircle2 size={16} /> Produto salvo!
            </p>
          )}

          <button
            type="submit"
            className="btn-primario"
            disabled={!valido || salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </form>
      </CartaoVidro>
    </div>
  );
}
