# Configuração DNS — istockbl.com.br

Domínio registrado na **NIC.br** (`.com.br`). Atualmente **sem registros DNS** apontando para o servidor.

## Visão geral (2 caminhos)

| Caminho | Quando usar | Dificuldade |
|---------|-------------|-------------|
| **A — Route53 (recomendado)** | DNS gerenciado na AWS, SSL automático | Média |
| **B — Registrador manual** | Manter DNS no Registro.br / Locaweb / etc. | Fácil |

---

## Caminho A — Route53 (recomendado para AWS)

### 1. Criar Hosted Zone na AWS

```bash
aws route53 create-hosted-zone \
  --name istockbl.com.br \
  --caller-reference "istock-$(date +%s)" \
  --region sa-east-1
```

Anote o **HostedZoneId** (ex: `Z0123456789ABC`) e os **4 nameservers** retornados (ex: `ns-123.awsdns-45.com`).

### 2. Apontar o domínio no Registro.br

1. Acesse [https://registro.br](https://registro.br) → login
2. **Meus domínios** → `istockbl.com.br` → **DNS**
3. Escolha **Usar servidores de nomes personalizados**
4. Cole os 4 nameservers da Route53:

```
ns-XXXX.awsdns-XX.org
ns-XXXX.awsdns-XX.co.uk
ns-XXXX.awsdns-XX.com
ns-XXXX.awsdns-XX.net
```

5. Salve e aguarde propagação (15 min a 48 h)

### 3. Deploy com DNS automático

```bash
cd ~/Projects/istock-web
HOSTED_ZONE_ID=Z_SEU_ID JWT_SECRET="$(openssl rand -hex 32)" ./aws/deploy.sh
```

O script cria:
- Certificado SSL (ACM) para `www.istockbl.com.br` e `istockbl.com.br`
- Registros A (ALIAS) para `www` e raiz
- Redirecionamento HTTP → HTTPS

---

## Caminho B — DNS no registrador (sem Route53)

### 1. Fazer deploy primeiro (sem Hosted Zone)

```bash
cd ~/Projects/istock-web
JWT_SECRET="$(openssl rand -hex 32)" ./aws/deploy.sh
```

Ao final, copie o **DNS do ALB** exibido, algo como:

```
istock-web-alb-123456789.sa-east-1.elb.amazonaws.com
```

### 2. Configurar no Registro.br

1. [https://registro.br](https://registro.br) → `istockbl.com.br` → **Editar zona**
2. Adicione os registros:

#### Subdomínio www (obrigatório)

| Campo | Valor |
|-------|-------|
| **Tipo** | CNAME |
| **Nome** | `www` |
| **Destino** | `istock-web-alb-XXXX.sa-east-1.elb.amazonaws.com` |
| **TTL** | 3600 |

#### Domínio raiz (@)

O Registro.br **não aceita CNAME na raiz**. Opções:

**Opção 1 — Redirecionamento do Registro.br (mais simples)**

1. No painel do Registro.br → **Redirecionamento**
2. De: `istockbl.com.br` → Para: `https://www.istockbl.com.br`

**Opção 2 — Route53 só para validação SSL**

Use certificado ACM com validação DNS manual (registros CNAME de validação no Registro.br).

### 3. Certificado SSL (se não usou Route53)

```bash
# Solicitar certificado na região sa-east-1
aws acm request-certificate \
  --domain-name www.istockbl.com.br \
  --subject-alternative-names istockbl.com.br \
  --validation-method DNS \
  --region sa-east-1
```

Adicione os registros CNAME de validação que a AWS mostrar no painel do Registro.br.

Depois redeploy com o ARN do certificado:

```bash
CERTIFICATE_ARN="arn:aws:acm:sa-east-1:CONTA:certificate/UUID" \
JWT_SECRET="sua-chave" ./aws/deploy.sh
```

---

## Registros DNS — resumo final

Após deploy + DNS configurado, deve funcionar assim:

```
https://www.istockbl.com.br  →  ALB AWS  →  ECS (iStock)
https://istockbl.com.br      →  redireciona para www
http://*                     →  redireciona para https
```

---

## Verificar propagação

```bash
# Deve retornar o ALB ou IP da AWS
dig +short www.istockbl.com.br

# Health check da API
curl -s https://www.istockbl.com.br/api/health
```

Resposta esperada:

```json
{"status":"ok","app":"iStock Web","version":"1.0.0","url":"https://www.istockbl.com.br"}
```

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Site não abre | Aguarde propagação DNS (até 48 h) |
| SSL inválido | Certificado ACM ainda validando — confira CNAMEs de validação |
| 502 Bad Gateway | ECS ainda subindo — aguarde 2–5 min após deploy |
| CORS error | Confirme `CORS_ORIGIN` no container inclui o domínio |
