# Guia rápido — Publicar em istockbl.com.br

Siga estes passos **na ordem**. Tempo estimado: 30–60 minutos.

---

## Passo 1 — Instalar ferramentas (macOS)

Abra o **Terminal** e execute:

```bash
cd ~/Projects/istock-web

# Opção A — Homebrew (aguarde se outro brew estiver rodando)
HOMEBREW_NO_AUTO_UPDATE=1 brew install awscli

# Opção B — Instalador oficial AWS (se Homebrew falhar)
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o /tmp/AWSCLIV2.pkg
sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
```

# Docker Desktop (interface gráfica)
brew install --cask docker
```

Depois **abra o Docker Desktop** pelo Launchpad e aguarde o ícone da baleia ficar verde.

Verifique:

```bash
aws --version
docker --version
docker info   # deve funcionar sem erro
```

---

## Passo 2 — Configurar credenciais AWS

### 2.1 Criar Access Key (se ainda não tiver)

1. Acesse [AWS Console](https://console.aws.amazon.com/) → login
2. Clique no seu nome (canto superior direito) → **Security credentials**
3. **Access keys** → **Create access key**
4. Escolha **Command Line Interface (CLI)** → confirme
5. Copie **Access Key ID** e **Secret Access Key** (só aparece uma vez)

### 2.2 Configurar no Mac

```bash
aws configure
```

| Pergunta | Resposta |
|----------|----------|
| AWS Access Key ID | sua chave |
| AWS Secret Access Key | sua chave secreta |
| Default region name | `sa-east-1` |
| Default output format | `json` |

Teste:

```bash
aws sts get-caller-identity
```

Deve retornar seu Account ID sem erro.

---

## Passo 3 — Publicar na AWS

### Opção automática (recomendada)

```bash
cd ~/Projects/istock-web
./aws/publicar.sh
```

O script pergunta se usa **Route53** ou **Registro.br** e faz o deploy.

### Opção manual

```bash
cd ~/Projects/istock-web
JWT_SECRET="$(openssl rand -hex 32)" ./aws/deploy.sh
```

Anote o **DNS do ALB** exibido no final (ex: `istock-web-alb-xxx.sa-east-1.elb.amazonaws.com`).

---

## Passo 4 — Configurar DNS no Registro.br

O domínio `istockbl.com.br` está **ativo** mas **sem registros DNS** ainda.

### Se usou Route53 (opção 1 no publicar.sh)

1. [registro.br](https://registro.br) → login
2. **Meus domínios** → `istockbl.com.br`
3. **Alterar servidores DNS** → usar os 4 nameservers da AWS (exibidos pelo `setup-route53.sh`)
4. Aguarde propagação (15 min – 48 h)

### Se manteve DNS no Registro.br (opção 2)

1. [registro.br](https://registro.br) → `istockbl.com.br` → **Editar zona**
2. Adicione:

| Tipo | Nome | Destino |
|------|------|---------|
| **CNAME** | `www` | DNS do ALB (do passo 3) |

3. **Redirecionamento** (domínio raiz):
   - De: `istockbl.com.br`
   - Para: `https://www.istockbl.com.br`

4. Para **HTTPS**, solicite certificado:

```bash
aws acm request-certificate \
  --domain-name www.istockbl.com.br \
  --subject-alternative-names istockbl.com.br \
  --validation-method DNS \
  --region sa-east-1
```

Adicione os CNAMEs de validação no Registro.br e redeploy:

```bash
CERTIFICATE_ARN="arn:aws:acm:sa-east-1:..." JWT_SECRET="..." ./aws/deploy.sh
```

---

## Passo 5 — Verificar

```bash
# DNS propagado?
dig +short www.istockbl.com.br

# API online?
curl https://www.istockbl.com.br/api/health
```

Abra no navegador: **https://www.istockbl.com.br**

Login inicial:
- E-mail: `admin@istock.com`
- Senha: `admin123` (altere após o primeiro acesso)

---

## Custos AWS estimados

| Serviço | Custo aproximado/mês |
|---------|---------------------|
| ECS Fargate (1 task) | ~USD 15–25 |
| ALB | ~USD 18 |
| EFS | ~USD 1–5 |
| Route53 (hosted zone) | ~USD 0.50 |
| **Total** | **~USD 35–50/mês** |

Para reduzir custos em testes, pare o serviço ECS após validar.

---

## Ajuda

| Arquivo | Conteúdo |
|---------|----------|
| `aws/DNS-REGISTRADOR.md` | Detalhes DNS |
| `aws/deploy.sh` | Script de deploy |
| `aws/setup-route53.sh` | Criar zona DNS na AWS |
| `aws/setup-prerequisites.sh` | Verificar instalações |
