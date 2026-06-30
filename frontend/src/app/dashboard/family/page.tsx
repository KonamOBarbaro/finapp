"use client";

import { useEffect, useState } from "react";

export default function FamilyPage() {
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // New member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIncome, setNewIncome] = useState("");
  
  const [editIncomeUser, setEditIncomeUser] = useState<string | null>(null);
  const [editIncomeValue, setEditIncomeValue] = useState("");

  const fetchFamily = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/family`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFamily(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/family/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          income: parseFloat(newIncome || "0")
        })
      });
      
      if (res.ok) {
        setShowAddForm(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setNewIncome("");
        fetchFamily();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao adicionar membro");
      }
    } catch (err) {
      alert("Erro ao adicionar membro");
    }
  };

  const handleUpdateIncome = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/family/income`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          userId,
          income: parseFloat(editIncomeValue || "0")
        })
      });
      
      if (res.ok) {
        setEditIncomeUser(null);
        fetchFamily();
      }
    } catch (err) {
      alert("Erro ao atualizar renda");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Família</h1>
          <p className="text-slate-400 mt-1">Gerencie os membros da sua casa e o rateio financeiro.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Adicionar Membro
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Novo Membro</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Nome do cônjuge/membro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Senha secreta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Renda Declarada (R$)</label>
                <input
                  type="number"
                  required
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Ex: 5000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Salvar Membro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Renda Total Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400/80">Renda Total da Família</p>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(family?.totalIncome || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {family?.members?.map((member: any) => (
          <div key={member.id} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-cyan-500/10"></div>
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-cyan-500/20">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-sm text-slate-400">{member.email}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{member.proportion.toFixed(1)}%</div>
                <p className="text-xs text-slate-500">Participação</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                  <span className="text-sm text-slate-300">Renda Declarada</span>
                </div>
                {editIncomeUser === member.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      autoFocus
                      className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                      value={editIncomeValue}
                      onChange={(e) => setEditIncomeValue(e.target.value)}
                    />
                    <button onClick={() => handleUpdateIncome(member.id)} className="text-xs bg-cyan-500 text-white px-2 py-1 rounded">OK</button>
                    <button onClick={() => setEditIncomeUser(null)} className="text-xs text-slate-400 px-1">X</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(member.income)}
                    </span>
                    <button onClick={() => {
                      setEditIncomeUser(member.id);
                      setEditIncomeValue(member.income.toString());
                    }} className="text-xs text-cyan-500 hover:text-cyan-400">
                      Editar
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Proportion Bar */}
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Peso nas despesas divididas</span>
                <span>{member.proportion.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${member.proportion}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
