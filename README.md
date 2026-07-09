# iStock Web

**Produção:** [https://www.istockbl.com.br](https://www.istockbl.com.br)

Gestão inteligente de inventário Apple — versão web com deploy em nuvem.

## Deploy na Azure (recomendado)

```bash
./azure/setup-prerequisites.sh
az login
az account set --subscription "sua-subscription"
./azure/deploy.sh
```

Documentação: [`azure/README.md`](azure/README.md)

## Outras nuvens

| Nuvem | Comando | Docs |
|-------|---------|------|
| **Azure** | `./azure/deploy.sh` | `azure/README.md` |
| Google Cloud | `./gcp/deploy.sh` | `gcp/README.md` |
| AWS | `./aws/deploy.sh` | `aws/` |

## Desenvolvimento local

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Login: `admin@istock.com` / `admin123`

## Estrutura

```
istock-web/
├── frontend/     React + Vite
├── backend/      Express + SQLite
├── azure/        Microsoft Azure ← novo
├── gcp/          Google Cloud
├── aws/          AWS
└── Dockerfile
```
# iStock-Web
