"use client";

import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "INFLOW" | "OUTFLOW";
  date: string;
  category: string | null;
  isShared: boolean;
  bankAccount: {
    name: string;
    type: string;
    bankConnection: { bankName: string };
  };
  splits: { user: { name: string }; amountOwed: number }[];
};

const CATEGORIES: Record<string, string> = {
  FOOD: "Alimentação",
  TRANSPORT: "Transporte",
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  ENTERTAINMENT: "Lazer",
  SHOPPING: "Compras",
  HOUSING: "Moradia",
  UTILITIES: "Contas",
  OTHER: "Outros",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const fetchTransactions = async (p: number, f: string, s: string) => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
        const params = new URLSearchParams({ page: String(p), limit: "20", type: f });
        if (s) params.set("search", s);
        const res = await fetch(`${apiUrl}/api/transactions?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions(page, filter, search);
  }, [page, filter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleFilterChange = (f: "ALL" | "INFLOW" | "OUTFLOW") => {
    setFilter(f);
    setPage(1);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalInflow = transactions.filter((t) => t.type === "INFLOW").reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.type === "OUTFLOW").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Transações</h1>
        <p className="text-slate-400 mt-1">Histórico completo de movimentações sincronizadas.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total no período</p>
          <p className="text-2xl font-bold text-white mt-1">{total} transações</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Entradas (página)</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(totalInflow)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Saídas (página)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{fmt(totalOutflow)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por descrição..."
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-medium hover:bg-cyan-400 transition-colors"
          >
            Buscar
          </button>
        </form>
        <div className="flex gap-2">
          {(["ALL", "INFLOW", "OUTFLOW"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? f === "INFLOW"
                    ? "bg-emerald-500 text-white"
                    : f === "OUTFLOW"
                    ? "bg-red-500 text-white"
                    : "bg-cyan-500 text-white"
                  : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {f === "ALL" ? "Todas" : f === "INFLOW" ? "Entradas" : "Saídas"}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-400 font-medium">Nenhuma transação encontrada</p>
            <p className="text-slate-500 text-sm mt-1">Sincronize seu banco para ver as movimentações aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  t.type === "INFLOW" ? "bg-emerald-500/15" : "bg-red-500/15"
                }`}>
                  <svg className={`w-5 h-5 ${t.type === "INFLOW" ? "text-emerald-400" : "text-red-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {t.type === "INFLOW"
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    }
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      {new Date(t.date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{t.bankAccount.bankConnection.bankName}</span>
                    {t.category && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {CATEGORIES[t.category] || t.category}
                        </span>
                      </>
                    )}
                    {t.isShared && t.splits.length > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">Rateado</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-lg ${t.type === "INFLOW" ? "text-emerald-400" : "text-red-400"}`}>
                    {t.type === "INFLOW" ? "+" : "-"}{fmt(t.amount)}
                  </p>
                  {t.isShared && t.splits.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.splits.map((s) => `${s.user.name.split(" ")[0]}: ${fmt(s.amountOwed)}`).join(" / ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm disabled:opacity-40 hover:border-cyan-500 transition-colors"
          >
            Anterior
          </button>
          <span className="text-slate-400 text-sm">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm disabled:opacity-40 hover:border-cyan-500 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
