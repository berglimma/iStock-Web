# iStock Web — Microsoft Azure

Deploy em **Azure Container Apps** (São Paulo) com dados persistentes em **Azure Files**.

## Arquitetura

| Componente | Serviço Azure |
|------------|---------------|
| App (frontend + API) | **Container Apps** |
| Imagem Docker | **Azure Container Registry (ACR)** |
| Banco SQLite + uploads | **Azure Files** (montado em `/data`) |
| JWT Secret | **Container Apps Secrets** |
| Build | **ACR Build** (sem Docker local) |
| Logs | **Log Analytics** |
| DNS / SSL | **Custom domain** + certificado gerenciado |

## Pré-requisitos

```bash
./azure/setup-prerequisites.sh
az login
az account set --subscription "sua-subscription"
```

> É necessária uma **subscription Azure** ativa (há crédito gratuito para novas contas).

## Deploy

```bash
cd ~/Projects/istock-web
./azure/deploy.sh
```

Ou:

```bash
npm run deploy:azure
```

O script:
1. Cria Resource Group `istock-rg`
2. Cria ACR, Storage, Container Apps Environment
3. Faz build da imagem **na nuvem** (`az acr build`)
4. Publica o Container App com volume `/data`

## Domínio istockbl.com.br

Veja `azure/DNS-GUIA.md`

```bash
az containerapp hostname add \
  --hostname www.istockbl.com.br \
  --name istock-web \
  --resource-group istock-rg
```

## Variáveis de ambiente

| Variável | Valor |
|----------|-------|
| `PORT` | `8080` |
| `JWT_SECRET` | Secret do Container App |
| `APP_URL` | `https://www.istockbl.com.br` |
| `DATABASE_PATH` | `/data/istock.db` |
| `UPLOAD_DIR` | `/data/uploads` |

## Comandos úteis

```bash
# URL do app
az containerapp show -n istock-web -g istock-rg \
  --query properties.configuration.ingress.fqdn -o tsv

# Logs
az containerapp logs show -n istock-web -g istock-rg --follow

# Atualizar após mudanças
./azure/deploy.sh

# Remover tudo
az group delete --name istock-rg --yes
```

## Custos estimados

| Serviço | Custo/mês (uso leve) |
|---------|---------------------|
| Container Apps | ~USD 10–25 |
| ACR Basic | ~USD 5 |
| Storage | ~USD 1–3 |
| Log Analytics | ~USD 2–5 |
| **Total** | **~USD 18–35/mês** |

## Personalizar deploy

```bash
AZURE_RESOURCE_GROUP=meu-rg \
AZURE_LOCATION=brazilsouth \
JWT_SECRET="$(openssl rand -hex 32)" \
./azure/deploy.sh
```
