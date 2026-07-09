# DNS — istockbl.com.br no Google Cloud

## Opção A — Cloud DNS (recomendado)

### 1. Criar zona DNS

```bash
gcloud dns managed-zones create istockbl-zone \
  --dns-name=istockbl.com.br \
  --description="iStock Web"
```

### 2. Obter nameservers

```bash
gcloud dns managed-zones describe istockbl-zone --format='value(nameServers)'
```

### 3. Configurar no Registro.br

1. [registro.br](https://registro.br) → `istockbl.com.br` → DNS
2. Troque os nameservers pelos 4 da Cloud DNS
3. Aguarde propagação

### 4. Mapear domínio no Cloud Run

```bash
# Obter URL do serviço
gcloud run services describe istock-web \
  --region=southamerica-east1 \
  --format='value(status.url)'

# Mapear domínio customizado
gcloud run domain-mappings create \
  --service=istock-web \
  --domain=www.istockbl.com.br \
  --region=southamerica-east1
```

Siga as instruções de verificação DNS exibidas pelo comando.

### 5. Domínio raiz

No Registro.br, configure redirecionamento:
- `istockbl.com.br` → `https://www.istockbl.com.br`

---

## Opção B — DNS no Registro.br (sem Cloud DNS)

### 1. Obter URL do Cloud Run

```bash
gcloud run services describe istock-web \
  --region=southamerica-east1 \
  --format='value(status.url)'
```

### 2. Mapear domínio

```bash
gcloud run domain-mappings create \
  --service=istock-web \
  --domain=www.istockbl.com.br \
  --region=southamerica-east1
```

O comando exibe registros DNS (geralmente CNAME) para adicionar no Registro.br.

| Tipo | Nome | Valor |
|------|------|-------|
| CNAME | `www` | (valor exibido pelo gcloud) |

### 3. Verificar

```bash
curl https://www.istockbl.com.br/api/health
```

---

## SSL

O Cloud Run provisiona certificado SSL automaticamente após o domain mapping ser verificado.
