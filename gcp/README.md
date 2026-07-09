# iStock Web — Google Cloud

Deploy do iStock em **Cloud Run** (São Paulo) com dados persistentes em **Cloud Storage**.

## Arquitetura

| Componente | Serviço GCP |
|------------|-------------|
| App (frontend + API) | **Cloud Run** |
| Imagem Docker | **Artifact Registry** |
| Banco SQLite + uploads | **Cloud Storage** (volume montado em `/data`) |
| JWT Secret | **Secret Manager** |
| Build CI/CD | **Cloud Build** (opcional) |
| DNS | **Cloud DNS** ou Registro.br |
| SSL | Automático no Cloud Run |

## Pré-requisitos

```bash
# Instalar gcloud + docker (Colima no macOS)
./gcp/setup-prerequisites.sh

# Autenticar
gcloud auth login
gcloud init   # escolha ou crie um projeto
```

## Deploy rápido

```bash
cd ~/Projects/istock-web
./gcp/deploy.sh
```

Ou via npm:

```bash
npm run deploy:gcp
```

## Deploy via Cloud Build (sem Docker local)

```bash
gcloud builds submit --config=gcp/cloudbuild.yaml .
```

## Domínio istockbl.com.br

Veja `gcp/DNS-GUIA.md` para mapear `www.istockbl.com.br` no Cloud Run.

```bash
gcloud run domain-mappings create \
  --service=istock-web \
  --domain=www.istockbl.com.br \
  --region=southamerica-east1
```

## Variáveis de ambiente (Cloud Run)

| Variável | Valor |
|----------|-------|
| `PORT` | `8080` |
| `APP_URL` | `https://www.istockbl.com.br` |
| `JWT_SECRET` | Secret Manager (`istock-jwt-secret`) |
| `DATABASE_PATH` | `/data/istock.db` |
| `UPLOAD_DIR` | `/data/uploads` |

## Custos estimados

| Serviço | Custo/mês (uso leve) |
|---------|---------------------|
| Cloud Run | ~USD 0–10 (pay per use) |
| Cloud Storage | ~USD 1–3 |
| Artifact Registry | ~USD 1 |
| **Total** | **~USD 5–15/mês** |

## Comandos úteis

```bash
# URL do serviço
gcloud run services describe istock-web --region=southamerica-east1 --format='value(status.url)'

# Logs
gcloud run services logs read istock-web --region=southamerica-east1

# Health check
curl $(gcloud run services describe istock-web --region=southamerica-east1 --format='value(status.url)')/api/health
```
