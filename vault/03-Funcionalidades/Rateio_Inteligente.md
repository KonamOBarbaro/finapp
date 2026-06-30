# Lógica de Rateio (Split) e Parcelamentos

O sistema de rateio será a "Killer Feature" (diferencial) do FinApp.

## Regras de Negócio do Rateio (Modelo de Renda Proporcional)
1. **Composição de Renda:** O sistema soma o salário do Junio (que é maior) com o da Esposa para obter a **Renda Total da Família**. A partir disso, calcula-se o "peso" de cada um (ex: Junio representa 65% da renda, Esposa 35%).
2. **Contas Fixas Individuais:**
   - O Junio tem suas contas (ex: Financiamento do Carro).
   - A Esposa tem as contas dela (ex: Faculdade).
   - Essas contas são abatidas do total, mas a responsabilidade de pagamento é mapeada individualmente no sistema.
3. **Despesas Compartilhadas (O Split):** Quando chega uma conta da casa (luz, supermercado), o sistema usa aquele peso (65/35) para gerar a dívida proporcional de cada um.
4. **Visão Consolidada (O Grande Resumo):** O aplicativo mostrará o montante total arrecadado pela família, abaterá as contas fixas de ambos e os rateios, e mostrará com precisão cirúrgica **quanto de dinheiro vai sobrar junto** no final do mês.

## Gestão de Parcelamentos
A fatura do cartão importada trará a parcela (ex: "Compra 3/10"). 
O banco de dados precisa prever o provisionamento das outras 7 parcelas nos meses seguintes para compor o gráfico de "Sobras Mês que Vem".
