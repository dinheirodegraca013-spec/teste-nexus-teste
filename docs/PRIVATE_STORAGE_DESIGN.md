# NEXUS — Storage privado de comprovantes (plano para aprovação)

**Status: NÃO IMPLANTADO.** Documento de proposta, sem autorização para executar SQL de infraestrutura. Escopo exclusivo do Supabase DEV `qidstqsbxwkbkwowhpab`.

## Problema corrigido preventivamente

A interface antiga convertia imagens em `data:image/*;base64,...` e tentava persistir o conteúdo no campo `photo_url` de `field_presences`, `car_stickers` e `house_stickers`. Isso consome linhas do banco com evidências potencialmente sensíveis e torna impossível aplicar segurança de arquivos de forma granular. Desde as alterações `photoEvidenceGuard.ts`, as operações rejeitam `data:`, `blob:`, URLs públicas e chaves incompatíveis. Seis selecionadores de arquivos foram desabilitados temporariamente, para não prometer um envio que não existe. Registros sem anexo permanecem sujeitos a RLS.

## Proposta de migração SQL — APROVAÇÃO ESPECÍFICA PENDENTE

A executar **somente** em banco DEV após revisão e teste isolado:

```sql
-- NÃO EXECUTAR SEM APROVAÇÃO ESPECÍFICA, REVISÃO E ROLLBACK.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nexus-evidence-private', 'nexus-evidence-private', false, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Estas quatro políticas são intencionalmente admin-only.
-- No passo seguinte ampliar apenas para vínculos hierárquicos seguros e testados.
CREATE POLICY nexus_evidence_admin_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'nexus-evidence-private'
  AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
  AND (SELECT private.nexus_is_admin())
);
CREATE POLICY nexus_evidence_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'nexus-evidence-private'
  AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
  AND (SELECT private.nexus_is_admin())
);
CREATE POLICY nexus_evidence_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'nexus-evidence-private'
  AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
  AND (SELECT private.nexus_is_admin())
)
WITH CHECK (
  bucket_id = 'nexus-evidence-private'
  AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
  AND (SELECT private.nexus_is_admin())
);
CREATE POLICY nexus_evidence_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'nexus-evidence-private'
  AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
  AND (SELECT private.nexus_is_admin())
);
```

**Atenção:** antes de usar este SQL, consultar as policies de `storage.objects` existentes, escolher nomes idempotentes, conferir executor e permissões reais de upload/download em uma instância de teste e revisar se `ON CONFLICT DO UPDATE` não alterará configuração pré-existente. Não fazer deploy como parte do runner do GitHub.

## Contrato de integração planejado

1. Guardar arquivos com chave `<organization_id>/<tipo>/<uuid>.webp`, sem e-mail, nome, RG, telefone ou placa no caminho.
2. Validar formato real, tamanho, tenant e permissão de escrita no servidor; nunca confiar em nome de arquivo ou `accept='image/*'`.
3. Armazenar no banco somente o caminho relativo após confirmação do upload no Storage. Se o registro falhar, fazer limpeza controlada do objeto órfão.
4. Mostrar foto via URL assinada de curta duração, obtida após autenticação e RLS, jamais URL pública ou string base64.
5. Testar dois tenants, usuário bloqueado, controlador sem vínculo, usuário de outra liderança, tentativas de URL pública e atualização/deleção sem autorização.
6. Definir consentimento, finalidade, retenção, capacidade de exclusão e trilha de auditoria. Não capturar imagens de pessoas/placas sem base legal adequada.

**Abertura de novo ciclo:** após aprovação específica da migração, implantar bucket no DEV, executar testes de política e só então reabilitar o `FileUpload` e introduzir a rotina de upload privado.
