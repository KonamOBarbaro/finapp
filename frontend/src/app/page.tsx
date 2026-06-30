"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      const endpoint = isRegister ? `${apiUrl}/api/auth/register` : `${apiUrl}/api/auth/login`;
      const payload = isRegister ? { email, password, name, income: Number(income) } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      // If registering, log them in immediately after or show success message
      if (isRegister) {
        setIsRegister(false);
        setError('Conta criada com sucesso! Faça login.');
      } else {
        // Save token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side - Brand/Imagery (Visible only on large screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface overflow-hidden">
        {/* Abstract Premium Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#0B2D5B] via-[#081831] to-[#040A14] z-0"></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] mix-blend-screen z-10"></div>
        <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] mix-blend-screen z-10"></div>
        
        <div className="relative z-20 w-full h-full flex flex-col justify-between p-16">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-2xl shadow-black/50 p-2 overflow-hidden">
              <img src="/logo.png" alt="AJ Solutions Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">AJ Solutions</span>
          </div>

          <div className="animate-fade-up">
            <h1 className="text-5xl lg:text-6xl font-light text-white leading-tight mb-6">
              Gestão Financeira<br />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">
                Elevada ao Nível Premium.
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md font-light">
              Conectando suas ideias a soluções reais. Tenha controle absoluto do seu patrimônio familiar com nossa integração Open Finance de última geração.
            </p>
          </div>
          
          <div className="text-sm text-gray-500 font-light">
            © {new Date().getFullYear()} AJ Solutions. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl z-0 lg:hidden"></div>
        
        <div className="w-full max-w-md relative z-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg p-1 overflow-hidden">
              <img src="/logo.png" alt="AJ Solutions" className="w-full h-full object-contain" />
            </div>
            <span className="text-foreground text-2xl font-bold tracking-tight">AJ Solutions</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground mb-3">{isRegister ? 'Criar Conta Família' : 'Bem-vindo de volta'}</h2>
            <p className="text-secondary font-light">{isRegister ? 'Configure seu perfil inicial e adicione sua renda' : 'Acesse seu workspace familiar'}</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl bg-surface border border-surface-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-sm placeholder:text-secondary/50 font-medium"
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Sua Renda Mensal (R$)</label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl bg-surface border border-surface-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-sm placeholder:text-secondary/50 font-medium"
                    placeholder="Ex: 10000"
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider">E-mail Corporativo ou Pessoal</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 rounded-xl bg-surface border border-surface-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-sm placeholder:text-secondary/50 font-medium"
                placeholder="nome@ajsolutions.com"
                required
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Senha de Acesso</label>
                <a href="#" className="text-xs font-medium text-accent hover:text-primary transition-colors">Esqueceu a senha?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-xl bg-surface border border-surface-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-sm placeholder:text-secondary/50 font-medium"
                placeholder="••••••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex justify-center items-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Acessar Painel')}</span>
              {!loading && <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-medium text-secondary hover:text-accent transition-colors"
            >
              {isRegister ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Crie agora'}
            </button>
          </div>
          
          <div className="mt-10 pt-8 border-t border-surface-border flex flex-col items-center justify-center space-y-4">
            <p className="text-sm text-secondary font-light">Powered by Open Finance Brasil</p>
            <div className="flex space-x-4 opacity-40 grayscale">
               {/* Mock logos of banks */}
               <div className="h-6 w-16 bg-foreground rounded flex items-center justify-center text-[10px] text-background font-bold">NUBANK</div>
               <div className="h-6 w-16 bg-foreground rounded flex items-center justify-center text-[10px] text-background font-bold">ITAÚ</div>
               <div className="h-6 w-16 bg-foreground rounded flex items-center justify-center text-[10px] text-background font-bold">BRADESCO</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
