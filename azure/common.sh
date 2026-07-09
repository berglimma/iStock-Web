#!/bin/bash
# Funções compartilhadas pelos scripts de deploy Azure

apply_azure_file_mount() {
  local app_name="$1"
  local resource_group="$2"
  local storage_mount="$3"
  local volume_name="${4:-istockvol}"
  local mount_path="${5:-/data}"

  if ! command -v jq &>/dev/null; then
    echo "❌ jq é necessário. Instale com: brew install jq"
    exit 1
  fi

  if ! az containerapp show --name "$app_name" --resource-group "$resource_group" &>/dev/null; then
    echo "❌ Container App ${app_name} não existe."
    exit 1
  fi

  local app_id
  app_id=$(az containerapp show --name "$app_name" --resource-group "$resource_group" --query id -o tsv)

  local patch
  patch=$(az containerapp show --name "$app_name" --resource-group "$resource_group" -o json | jq \
    --arg vol "$volume_name" \
    --arg mount "$storage_mount" \
    --arg path "$mount_path" \
    '
    .properties.template.volumes = (
      (.properties.template.volumes // [])
      | map(select(.name != $vol))
      + [{
          name: $vol,
          storageType: "AzureFile",
          storageName: $mount
        }]
    )
    | .properties.template.containers[0].volumeMounts = (
      (.properties.template.containers[0].volumeMounts // [])
      | map(select(.volumeName != $vol))
      + [{
          volumeName: $vol,
          mountPath: $path
        }]
    )
    | {
        properties: {
          template: {
            containers: .properties.template.containers,
            volumes: .properties.template.volumes
          }
        }
      }
    ')

  echo "→ Montando volume Azure Files (${storage_mount} → ${mount_path})..."
  az rest \
    --method patch \
    --uri "${app_id}?api-version=2024-03-01" \
    --body "$patch" \
    --output none
}

set_single_replica() {
  local app_name="$1"
  local resource_group="$2"

  echo "→ Garantindo réplica única (SQLite em Azure Files)..."
  az containerapp update \
    --name "$app_name" \
    --resource-group "$resource_group" \
    --min-replicas 1 \
    --max-replicas 1 \
    --output none
}

deactivate_old_revisions() {
  local app_name="$1"
  local resource_group="$2"
  local keep_revision="${3:-}"

  if [[ -z "$keep_revision" ]]; then
    keep_revision=$(az containerapp revision list \
      --name "$app_name" \
      --resource-group "$resource_group" \
      --query "sort_by(@, &properties.createdTime) | [-1].name" \
      -o tsv 2>/dev/null || true)
  fi

  echo "→ Desativando revisões antigas (mantendo ${keep_revision:-nenhuma})..."
  while IFS= read -r revision; do
    [[ -z "$revision" ]] && continue
    if [[ -n "$keep_revision" && "$revision" == "$keep_revision" ]]; then
      continue
    fi
    az containerapp revision deactivate \
      --name "$app_name" \
      --resource-group "$resource_group" \
      --revision "$revision" \
      --output none 2>/dev/null || true
  done < <(az containerapp revision list \
    --name "$app_name" \
    --resource-group "$resource_group" \
    --query "[?properties.active].name" \
    -o tsv)
}

cleanup_sqlite_locks_on_share() {
  local resource_group="$1"
  local storage_mount="${2:-istockdata}"
  local env_name="${3:-istock-env}"

  local account share
  account=$(az containerapp env storage list -g "$resource_group" -n "$env_name" \
    --query "[?name=='${storage_mount}'].properties.azureFile.accountName | [0]" -o tsv)
  share=$(az containerapp env storage list -g "$resource_group" -n "$env_name" \
    --query "[?name=='${storage_mount}'].properties.azureFile.shareName | [0]" -o tsv)

  if [[ -z "$account" || -z "$share" ]]; then
    echo "⚠️  Storage mount ${storage_mount} não encontrado; pulando limpeza."
    return 0
  fi

  echo "→ Limpando locks SQLite em ${account}/${share}..."
  local key
  key=$(az storage account keys list -g "$resource_group" -n "$account" --query "[0].value" -o tsv)

  for suffix in "-wal" "-shm" "-journal"; do
    az storage file delete \
      --account-name "$account" \
      --account-key "$key" \
      --share-name "$share" \
      --path "backups/istock.db${suffix}" \
      --output none 2>/dev/null || true
    az storage file delete \
      --account-name "$account" \
      --account-key "$key" \
      --share-name "$share" \
      --path "istock.db${suffix}" \
      --output none 2>/dev/null || true
  done
}
