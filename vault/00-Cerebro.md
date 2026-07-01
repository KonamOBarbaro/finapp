# 🧠 Cérebro do Projeto FinApp (AJ Solutions)

Este é o nosso centro neural de planejamento e documentação. **Nada se perde, tudo se conecta.**

## 📌 Links Rápidos
- [[Roadmap]] - Onde estamos e para onde vamos
- [[Modelo_SaaS]] - Estrutura multi-tenant e monetização
- [[Rateio_Inteligente]] - Lógica de divisão de despesas e parcelas

## 🎯 Objetivo Principal
Criar a plataforma definitiva de **Gestão Financeira Familiar Inteligente**, começando como uso próprio e evoluindo para um **SaaS / App (Google Play)** sob a marca AJ Solutions.

## 🛠 Stack Tecnológica
* **Backend:** Node.js, Express, Prisma (PostgreSQL/SQLite)
* **Frontend Web:** Next.js, TailwindCSS (Design Premium Glassmorphism)
* **Mobile:** React Native (Expo)
* **Open Finance:** Pluggy/Belvo

- **[2026-07-01]** Refatoração do Frontend (Next.js): substituição de `<img>` por `<Image>` nativo do Next.js; correção do anti-pattern de setState dentro de useEffect; e tipagem rigorosa de componentes com remoção de `any`.

## 🏗 Evolução Arquitetural
- **[2026-07-01] Arquitetura Híbrida de Contas:** Para não deixar o sistema engessado, as contas agora podem ser offline (`type: WALLET`), permitindo o registro de transações manuais via um Modal.
- **[2026-07-01] Privacidade & Caixa Único:** Contas passaram a ter a propriedade `isShared` para distinguir finanças conjuntas de contas privadas do casal. A engine de divisão ganhou 4 modos independentes (Proporcional, Igualitário, Simbólico e Caixa Único).
