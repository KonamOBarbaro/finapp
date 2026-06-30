"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  { ssr: false }
);

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pluggyToken, setPluggyToken] = useState<string | null>(null);
  const router = useRouter();

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState('OUTFLOW');
  const [formAccountId, setFormAccountId] = useState('');
  const [formIsShared, setFormIsShared] = useState(true);
  const [formUserId, setFormUserId] = useState('');
  const [formIsInstallment, setFormIsInstallment] = useState(false);
  const [formInstallments, setFormInstallments] = useState('2');

  const handleConnectPluggy = async () => {
    setSyncStatus('loading');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      const res = await fetch(`${apiUrl}/api/open-finance/token`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(`Backend retornou ${res.status}`);
      const json = await res.json();
      if (json.accessToken) {
        setPluggyToken(json.accessToken);
        setSyncStatus('idle');
      } else {
        throw new Error('Token não retornado');
      }
    } catch (err) {
      console.error('Erro ao conectar com Pluggy:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
        const res = await fetch(`${apiUrl}/api/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Token inválido');
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        localStorage.removeItem('token');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      const url = formIsInstallment 
        ? `${apiUrl}/api/transactions/installments` 
        : `${apiUrl}/api/transactions`;
      
      const body = formIsInstallment ? {
        bankAccountId: formAccountId || data?.accounts[0]?.id,
        description: formDesc,
        totalAmount: Number(formAmount),
        totalInstallments: Number(formInstallments),
        isShared: formIsShared,
        userId: formIsShared ? undefined : formUserId || data?.users[0]?.id
      } : {
        bankAccountId: formAccountId || data?.accounts[0]?.id,
        description: formDesc,
        amount: Number(formAmount),
        type: formType,
        isShared: formIsShared,
        userId: formIsShared ? undefined : formUserId || data?.users[0]?.id
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormDesc('');
        setFormAmount('');
        // Refetch
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
        const dashRes = await fetch(`${apiUrl}/api/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
        setData(await dashRes.json());
      } else {
        const error = await res.json();
        alert('Erro ao salvar: ' + error.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-10 animate-fade-up">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Visão Geral</h1>
          <p className="text-secondary font-medium mt-1">Acompanhamento financeiro em tempo real</p>
        </div>
        
        <div className="flex space-x-3">
          <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-surface border border-surface-border text-foreground font-semibold shadow-sm hover:shadow-md transition-all flex items-center space-x-2">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <span>Nova Transação</span>
          </button>
          <button
            onClick={handleConnectPluggy}
            disabled={syncStatus === 'loading'}
            className={`px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all flex items-center space-x-2 ${
              syncStatus === 'error'
                ? 'bg-red-600 text-white shadow-red-500/25'
                : 'bg-primary text-white shadow-primary/25 hover:bg-primary-light disabled:opacity-60 disabled:cursor-not-allowed'
            }`}
          >
            {syncStatus === 'loading' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                <span>Conectando...</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Backend offline — veja instruções</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                <span>Sincronizar Open Finance</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main KPI Cards - Credit Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Balance Card (Glass/Gradient) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2D5B] to-[#1A365D] p-8 shadow-xl border border-[#1D4ED8]/30 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[50px] transform group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
            <h3 className="text-white/70 text-sm font-medium uppercase tracking-wider mb-2">Patrimônio Consolidado</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-white/60 text-2xl font-light">R$</span>
              <span className="text-white text-5xl font-bold tracking-tight">
                {data?.finances?.totalBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <span className="text-white text-sm font-semibold">+ 4.2%</span>
              </div>
              <span className="text-white/50 text-sm">Atualizado agora</span>
            </div>
          </div>
        </div>

        {/* Leftover Card */}
        <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>
            </div>
            <h3 className="text-secondary text-sm font-medium uppercase tracking-wider mb-1">Sobra Familiar (Mês)</h3>
            <p className="text-foreground text-3xl font-bold tracking-tight">
              R$ {data?.finances?.leftover?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </p>
          </div>
          <div className="w-full bg-surface-border h-1.5 rounded-full mt-6">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg>
            </div>
            <h3 className="text-secondary text-sm font-medium uppercase tracking-wider mb-1">Despesas do Mês</h3>
            <p className="text-foreground text-3xl font-bold tracking-tight">
              R$ {data?.finances?.totalExpenses?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-full bg-surface-border h-1.5 rounded-full mt-6">
            <div className="bg-red-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: '43%' }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bank Accounts List - Refined */}
        <div className="glass-panel rounded-2xl p-8 col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-foreground">Contas Conectadas</h2>
            <a href="#" className="text-sm font-semibold text-accent hover:text-primary transition-colors">Gerenciar Conexões</a>
          </div>
          
          <div className="space-y-4">
            {data?.accounts?.length > 0 ? data.accounts.map((acc: any, idx: number) => (
              <div key={idx} className="group flex items-center justify-between p-5 bg-surface rounded-2xl border border-surface-border hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer">
                <div className="flex items-center space-x-5">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md ${acc.isCredit ? 'bg-gradient-to-br from-gray-800 to-black' : 'bg-gradient-to-br from-[#8A05BE] to-[#5a037c]'}`}>
                    {acc.isCredit ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg> : acc.bank?.substring(0, 2) || 'BN'}
                  </div>
                  <div>
                    <p className={`font-bold text-lg transition-colors ${acc.isCredit ? 'text-foreground group-hover:text-red-500' : 'text-foreground group-hover:text-accent'}`}>{acc.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${acc.isCredit ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                      <p className="text-sm text-secondary font-medium">{acc.isCredit ? 'Cartão de Crédito' : 'Sincronizado'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-xl ${acc.balance < 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {acc.balance < 0 ? '- ' : ''}R$ {Math.abs(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-secondary font-medium mt-1">{acc.bank || 'Banco'}</p>
                </div>
              </div>
            )) : (
              <p className="text-secondary text-center py-4">Nenhuma conta sincronizada. Conecte seu banco.</p>
            )}
          </div>
        </div>

        {/* Goals & Limits - Refined */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-foreground">Objetivos</h2>
            <button className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center text-foreground hover:bg-accent hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
          
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="font-bold text-foreground block text-lg">Reserva de Emergência</span>
                  <span className="text-sm text-secondary font-medium">Tesouro Selic</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-accent block text-lg">R$ 20.000</span>
                  <span className="text-xs text-secondary font-medium">Meta: R$ 50.000</span>
                </div>
              </div>
              <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-accent to-[#10B981] h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '40%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="font-bold text-foreground block text-lg">Viagem Europa</span>
                  <span className="text-sm text-secondary font-medium">CDB Liquidez</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-accent block text-lg">R$ 12.000</span>
                  <span className="text-xs text-secondary font-medium">Meta: R$ 30.000</span>
                </div>
              </div>
              <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-accent to-[#10B981] h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '40%' }}></div>
              </div>
            </div>
            
            {/* Limit Warning */}
            <div className="mt-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <div>
                  <h4 className="text-red-500 font-bold">Aviso de Limite</h4>
                  <p className="text-sm text-red-400/80 mt-1">Os gastos com <strong>Restaurantes</strong> atingiram 90% do limite configurado para o mês.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rateios Inteligentes (Split Payments) e Parcelamentos */}
      <div className="glass-panel rounded-2xl p-8 mt-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gestão de Rateio & Parcelamentos</h2>
            <p className="text-sm text-secondary font-medium mt-1">
              Divisão inteligente de despesas: {data?.users?.map((u: any) => `${Math.round(u.percentage)}% ${u.name.split(' ')[0]}`).join(' / ')}
            </p>
          </div>
          <button className="px-4 py-2 bg-accent/10 text-accent font-semibold rounded-xl hover:bg-accent hover:text-white transition-colors">
            Ajustar Proporção
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rateio Items */}
          {data?.splits?.map((split: any, idx: number) => (
            <div key={idx} className="p-5 bg-surface border border-surface-border rounded-2xl hover:border-accent/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{split.description}</h4>
                    <p className="text-xs text-secondary font-medium">Conta Compartilhada</p>
                  </div>
                </div>
                <span className="font-bold text-foreground">R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-surface-border text-sm">
                
                {split.shares?.map((share: any, sIdx: number) => (
                  <div key={sIdx} className="flex items-center space-x-2">
                    {sIdx === 0 && <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">{share.name.charAt(0)}</div>}
                    <span className="text-secondary">{share.name.split(' ')[0]} <strong className="text-foreground">R$ {share.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    {sIdx !== 0 && <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">{share.name.charAt(0)}</div>}
                  </div>
                ))}

              </div>
            </div>
          ))}

          {/* Parcelamento Item */}
          <div className="p-5 bg-surface border border-surface-border rounded-2xl hover:border-accent/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Geladeira Brastemp</h4>
                  <p className="text-xs text-secondary font-medium">XP Visa Infinite - Fatura Fechada</p>
                </div>
              </div>
              <span className="font-bold text-foreground">R$ 4.800,00</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-secondary">Progresso: Parcela 3 de 10</span>
              <span className="text-xs font-bold text-foreground">Falta R$ 3.360,00</span>
            </div>
            <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden mb-3">
              <div className="bg-accent h-1.5 rounded-full" style={{ width: '30%' }}></div>
            </div>
            <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-surface-border text-sm">
              <span className="text-secondary">Parcela Mensal (Total)</span>
              <strong className="text-foreground">R$ 480,00</strong>
            </div>
          </div>
        </div>
      </div>

    </div>

    {pluggyToken && (
      <PluggyConnect
        connectToken={pluggyToken}
        includeSandbox={true}
        onSuccess={async (itemData: { item: { id: string } }) => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
            await fetch(`${apiUrl}/api/open-finance/connect`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({ itemId: itemData.item.id }),
            });
            // Atualiza o dashboard com os novos dados do banco
            const res = await fetch(`${apiUrl}/api/dashboard`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) setData(await res.json());
          } catch (err) {
            console.error('Erro ao salvar conexão bancária:', err);
          } finally {
            setPluggyToken(null);
          }
        }}
        onError={(error: any) => {
          console.error('Erro no widget da Pluggy:', error);
          setPluggyToken(null);
        }}
        onClose={() => setPluggyToken(null)}
      />
    )}

    </>
  )
}
