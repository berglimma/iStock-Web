# DNS — istockbl.com.br na Azure

## 1) Obter URL do Container App

```bash
az containerapp show \
  --name istock-web \
  --resource-group istock-rg \
  --query properties.configuration.ingress.fqdn -o tsv
```

Exemplo: `istock-web.ashyfield-abc123.brazilsouth.azurecontainerapps.io`

---

## 2) Opção A — Domínio customizado no Container Apps

### Via Portal Azure
1. **Container Apps** → `istock-web` → **Custom domains**
2. **Add custom domain**
3. Domínio: `www.istockbl.com.br`
4. Tipo: **Managed certificate** (SSL gratuito)
5. Copie o registro DNS de verificação exibido

### Via CLI

```bash
az containerapp hostname add \
  --hostname www.istockbl.com.br \
  --name istock-web \
  --resource-group istock-rg
```

Siga as instruções de validação DNS.

---

## 3) Configurar no Registro.br

Acesse [registro.br](https://registro.br) → **Meus domínios** → `istockbl.com.br` → **DNS** / **Editar zona**.

Obtenha o ID de verificação e o FQDN do app:

```bash
az containerapp show-custom-domain-verification-id -o tsv
az containerapp show -n istock-web -g istock-rg \
  --query properties.configuration.ingress.fqdn -o tsv
```

### Registros obrigatórios

| Tipo | Nome (no Registro.br) | Valor completo |
|------|------------------------|----------------|
| **TXT** | `asuid.www` | ID de verificação do Azure (ex.: `BB36586EE565AE93836DB0879EFDB448B51A12AF733A1865C27396C93DC209CC`) |
| **CNAME** | `www` | `istock-web.happysky-eb0990cb.brazilsouth.azurecontainerapps.io` |

> O campo **Nome** no Registro.br é relativo ao domínio.  
> `asuid.www` cria o registro `asuid.www.istockbl.com.br`.  
> `www` cria `www.istockbl.com.br`.

### Erro comum

```
InvalidCustomHostNameValidation: A TXT record pointing from
asuid.www.istockbl.com.br to <ID> was not found.
```

**Solução:** crie o TXT **antes** de rodar `./azure/setup-https.sh`. Aguarde 5–30 min e verifique:

```bash
dig TXT asuid.www.istockbl.com.br +short
dig CNAME www.istockbl.com.br +short
```

### Domínio raiz (@)

No Registro.br, configure redirecionamento:
- `istockbl.com.br` → `https://www.istockbl.com.br`

---

## 4) Opção B — Azure DNS

```bash
# Criar zona DNS
az network dns zone create \
  --resource-group istock-rg \
  --name istockbl.com.br

# Listar nameservers
az network dns zone show \
  --resource-group istock-rg \
  --name istockbl.com.br \
  --query nameServers -o tsv
```

Configure os nameservers no Registro.br e crie os registros CNAME conforme o Container App.

---

## 5) Verificar

```bash
curl https://www.istockbl.com.br/api/health
```

Resposta esperada:

```json
{"status":"ok","app":"iStock Web","version":"1.0.0"}
```

---

## SSL

O Azure Container Apps provisiona certificado gerenciado automaticamente após validação do domínio customizado.
