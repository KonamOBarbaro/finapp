# Arquitetura Multi-Tenant (SaaS)

Para que o FinApp (AJ Solutions) possa ser vendido ou lançado no Google Play, a estrutura do banco precisa isolar os clientes.

## Conceito Core: Workspace
Tudo no sistema não pertence a um "User", mas sim a um "Workspace" (Família).
- O Junio e a Esposa pertencem ao Workspace ID `XYZ`.
- O cliente João e a Maria pertencerão ao Workspace ID `ABC`.

Ao fazer qualquer busca de Transações, Contas ou Limites, o Backend **SEMPRE** filtra por `workspaceId`. Isso garante segurança máxima e impede vazamento de dados.
