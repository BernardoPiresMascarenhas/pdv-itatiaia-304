"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PDV() {

  const [isAutenticado, setIsAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroLogin, setErroLogin] = useState("");


  const [produtos, setProdutos] = useState<any[]>([]);
  const [comandas, setComandas] = useState<any[]>([]);
  const [comandaAbertaId, setComandaAbertaId] = useState<number | null>(null);
  const [buscaComanda, setBuscaComanda] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<string>("Pendente");
  const [carregando, setCarregando] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("Todas");

  useEffect(() => {
    if (isAutenticado) {
      carregarDados();
    }
  }, [isAutenticado]);

  const carregarDados = async () => {
    setCarregando(true);
    const { data: dbProdutos } = await supabase.from('produtos').select('*').order('nome');
    if (dbProdutos) setProdutos(dbProdutos);

    const { data: dbComandas } = await supabase
      .from('comandas')
      .select('*, itens_comanda(*, produtos(*))')
      .eq('status', 'aberta')
      .order('created_at', { ascending: false });
    
    if (dbComandas) setComandas(dbComandas);
    setCarregando(false);
  };


  const fazerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const senhaCorreta = process.env.NEXT_PUBLIC_SENHA_SISTEMA;

    if (senhaInput === senhaCorreta) {
      setIsAutenticado(true);
      setErroLogin("");
    } else {
      setErroLogin("Senha incorreta. Tente novamente.");
      setSenhaInput(""); // Limpa o campo
    }
  };


  const criarComanda = async () => {
    const nome = prompt("Nome da Comanda ou Mesa (ex: Mesa 05):");
    if (!nome) return;

    const { data, error } = await supabase
      .from('comandas')
      .insert([{ nome: nome }])
      .select()
      .single();

    // Se der erro, joga na tela!
    if (error) {
      console.error("Erro ao criar mesa:", error);
      alert("Erro ao criar mesa no banco: " + error.message);
    } else if (data) {
      setComandas([{ ...data, itens_comanda: [] }, ...comandas]);
    }
  };

  const deletarComanda = async (id: number) => {
    if (!confirm("Tem certeza que deseja apagar esta comanda do sistema?")) return;
    
    await supabase.from('comandas').delete().eq('id', id);
    setComandas(comandas.filter((c) => c.id !== id));
  };

  const adicionarProduto = async (produto: any) => {
    const { data, error } = await supabase
      .from('itens_comanda')
      .insert([{ 
        comanda_id: comandaAbertaId, 
        produto_id: produto.id, 
        valor_unitario: produto.preco 
      }])
      .select('*, produtos(*)')
      .single();

    if (!error && data) {
      setComandas(comandas.map(c => 
        c.id === comandaAbertaId ? { ...c, itens_comanda: [...c.itens_comanda, data] } : c
      ));
    }
  };

  const removerItem = async (itemId: number) => {
    await supabase.from('itens_comanda').delete().eq('id', itemId);
    
    setComandas(comandas.map(c => {
      if (c.id === comandaAbertaId) {
        return { ...c, itens_comanda: c.itens_comanda.filter((item: any) => item.id !== itemId) };
      }
      return c;
    }));
  };


  const abrirComanda = (id: number) => {
    setComandaAbertaId(id);
    setFormaPagamento("Pendente");
    setCategoriaSelecionada("Todas");
    setBuscaProduto("");
  };

  const fecharComandaTela = () => {
    setComandaAbertaId(null);
    setFormaPagamento("Pendente");
  };

  const calcularTotal = (itens: any[]) => {
    if (!itens) return 0;
    return itens.reduce((acc, item) => acc + Number(item.valor_unitario), 0);
  };

  const comandaAtual = comandas.find((c) => c.id === comandaAbertaId);
  const comandasFiltradas = comandas.filter(c => c.nome.toLowerCase().includes(buscaComanda.toLowerCase()));
  
  const categoriasUnicas = ["Todas", ...Array.from(new Set(produtos.map(p => p.categoria || "Outros")))];

  const produtosFiltrados = produtos
    .filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))
    .filter(p => categoriaSelecionada === "Todas" || (p.categoria || "Outros") === categoriaSelecionada);
  
  const produtosAgrupados = produtosFiltrados.reduce((acc: any, produto) => {
    const categoria = produto.categoria || "Outros";
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(produto);
    return acc;
  }, {});

  const itensCupomAgrupados = comandaAtual?.itens_comanda?.reduce((acc: any[], item: any) => {
    const existente = acc.find((i: any) => i.produto_id === item.produto_id);
    if (existente) {
      existente.quantidade += 1;
      existente.valor_total += Number(item.valor_unitario);
      existente.ids_banco.push(item.id);
    } else {
      acc.push({
        produto_id: item.produto_id,
        nome: item.produtos.nome,
        quantidade: 1,
        valor_unitario: Number(item.valor_unitario),
        valor_total: Number(item.valor_unitario),
        ids_banco: [item.id]
      });
    }
    return acc;
  }, []);

  if (!isAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans print:hidden relative overflow-hidden">
        {/* Efeito visual de fundo */}
        <div className="absolute w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] -top-20 -left-20"></div>
        <div className="absolute w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[80px] bottom-0 right-0"></div>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border-t-4 border-amber-500">
          <div className="text-center mb-8">
            <div className="bg-slate-900 text-amber-500 w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
              🍻
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Itatiaia <span className="font-light">304</span></h1>
            <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-bold">Acesso Restrito</p>
          </div>

          <form onSubmit={fazerLogin} className="space-y-6">
            <div>
              <label className="block text-slate-700 text-sm font-bold mb-2">Senha do Sistema</label>
              <input
                type="password"
                placeholder="Digite a senha..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono text-center text-xl tracking-widest"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                autoFocus
              />
            </div>
            
            {erroLogin && (
              <p className="text-red-500 text-sm text-center font-bold animate-pulse">{erroLogin}</p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-lg uppercase tracking-wider"
            >
              Entrar no Caixa
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-2xl font-black text-slate-800 tracking-widest uppercase">Carregando Sistema... 🍻</div>;

  if (comandaAbertaId === null) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 print:hidden font-sans">
        <header className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl mb-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-amber-500">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-full text-2xl">🍻</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-wider text-amber-500 leading-none">
                ITATIAIA <span className="text-white font-light">304</span>
              </h1>
              <p className="text-slate-400 text-sm tracking-widest uppercase mt-1">Painel de Comandas</p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsAutenticado(false)} 
              className="bg-slate-800 text-slate-300 px-6 py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              🔒 Sair
            </button>
            <button 
              onClick={criarComanda} 
              className="flex-1 md:flex-none bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-amber-400 transition-transform active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              + NOVA MESA
            </button>
          </div>
        </header>

        <div className="mb-8 relative max-w-xl mx-auto md:mx-0">
          <span className="absolute left-4 top-4 text-slate-400 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Buscar por mesa ou cliente..."
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl shadow-sm focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-lg font-medium"
            value={buscaComanda}
            onChange={(e) => setBuscaComanda(e.target.value)}
          />
        </div>

        {comandas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🍺</p>
            <p className="text-slate-500 text-2xl font-medium">Nenhuma mesa aberta no momento.</p>
            <p className="text-slate-400">Clique em "Nova Mesa" para começar a vender!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {comandasFiltradas.map((comanda) => (
              <div key={comanda.id} className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 relative group flex flex-col justify-between min-h-[220px] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-800"></div>
                <div>
                  <div className="flex justify-between items-start mb-2 mt-2">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight truncate pr-2">
                      {comanda.nome}
                    </h2>
                    <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
                      {comanda.itens_comanda?.length || 0} itens
                    </span>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total da Conta</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                      <span className="text-xl text-slate-400 font-medium mr-1 border-r-2 border-amber-500 pr-1">R$</span>
                      {calcularTotal(comanda.itens_comanda).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => abrirComanda(comanda.id)} 
                    className="flex-1 bg-slate-900 text-amber-500 py-3.5 rounded-xl font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md text-sm"
                  >
                    Abrir Mesa
                  </button>
                  <button 
                    onClick={() => deletarComanda(comanda.id)} 
                    className="px-4 bg-red-50 text-red-500 py-3.5 rounded-xl font-bold hover:bg-red-100 transition-colors" 
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 print:bg-white print:h-auto print:block">
      
      {/* LADO ESQUERDO: PAINEL DE CARDÁPIO */}
      <div className="w-2/3 p-8 flex flex-col h-full overflow-hidden print:hidden">
        
        <div className="flex items-center gap-6 mb-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 shrink-0">
          <button 
            onClick={fecharComandaTela} 
            className="flex items-center justify-center w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-xl transition-colors"
            title="Voltar ao Painel"
          >
            ←
          </button>
          <div>
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-1">Adicionando itens à</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{comandaAtual?.nome}</h1>
          </div>
        </div>
        
        <div className="relative mb-4 shrink-0">
          <span className="absolute left-4 top-4 text-slate-400 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar produto no cardápio..."
            className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl shadow-sm focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-lg font-medium"
            value={buscaProduto}
            onChange={(e) => setBuscaProduto(e.target.value)}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 mb-2 shrink-0 scrollbar-hide">
          {categoriasUnicas.map(categoria => (
            <button
              key={categoria}
              onClick={() => setCategoriaSelecionada(categoria)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                categoriaSelecionada === categoria 
                ? "bg-slate-800 text-amber-400 border-slate-800" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
        
        <div className="overflow-y-auto pr-2 pb-10 flex-grow">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <p className="text-center text-slate-400 mt-10 font-medium">Nenhum produto encontrado.</p>
          ) : (
            Object.entries(produtosAgrupados).map(([categoria, itens]: any) => (
              <div key={categoria} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-lg font-black uppercase text-slate-500 tracking-widest shrink-0">
                    {categoria}
                  </h2>
                  <div className="h-px bg-slate-200 w-full"></div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {itens.map((produto: any) => (
                    <div key={produto.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-400 hover:shadow-md flex justify-between items-center transition-all group h-28">
                      <div className="flex flex-col justify-center h-full pr-3 w-full">
                        <h3 className="font-bold text-slate-700 leading-tight text-sm group-hover:text-slate-900 transition-colors line-clamp-2">
                          {produto.nome}
                        </h3>
                        <p className="text-emerald-600 font-black mt-1">
                          R$ {Number(produto.preco).toFixed(2)}
                        </p>
                      </div>
                      <button 
                        onClick={() => adicionarProduto(produto)}
                        className="bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-amber-500 w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-2xl font-black shadow-sm active:scale-90 transition-all"
                        title="Adicionar à comanda"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LADO DIREITO: O CUPOM E CAIXA */}
      <div className="w-1/3 bg-slate-100 border-l border-slate-200 flex flex-col shadow-2xl z-10 print:w-full print:border-none print:shadow-none print:bg-white h-full relative">
        
        <div className="absolute inset-0 bg-slate-800 print:hidden h-40"></div>

        <div className="flex-grow w-full max-w-[340px] mx-auto mt-6 mb-4 bg-white rounded-t-sm shadow-xl p-6 print:max-w-[80mm] print:m-0 print:p-0 font-mono text-sm text-black overflow-y-auto print:overflow-visible z-10 print:shadow-none">
          
          <div className="text-center mb-6 border-b-2 border-dashed border-slate-300 pb-4 print:mt-0">
            <h2 className="text-2xl font-bold uppercase tracking-widest">Itatiaia 304</h2>
            <p className="text-xs text-slate-500 mt-1">Bar & Gastronomia</p>
          </div>
          
          <div className="mb-6 text-sm font-bold bg-slate-50 p-2 rounded print:bg-transparent print:p-0">
            <p className="uppercase">MESA: {comandaAtual?.nome}</p>
          </div>

          <table className="w-full text-left mb-6 text-xs">
            <thead>
              <tr className="border-b-2 border-dashed border-slate-300 text-slate-500">
                <th className="pb-2 font-semibold">QTD</th>
                <th className="pb-2 font-semibold">ITEM</th>
                <th className="text-right pb-2 font-semibold">R$</th>
                <th className="text-right pb-2 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="align-top">
              {itensCupomAgrupados?.map((item: any) => (
                <tr key={item.produto_id} className="border-b border-slate-100 print:border-b-0 print:border-dashed group">
                  <td className="py-2 pr-2 text-slate-500 font-bold">{item.quantidade}x</td>
                  <td className="py-2 pr-2 font-medium">{item.nome}</td>
                  <td className="py-2 text-right font-medium">{item.valor_total.toFixed(2)}</td>
                  <td className="py-2 text-right print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removerItem(item.ids_banco[item.ids_banco.length - 1])} 
                      className="text-red-500 ml-2 bg-red-50 w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors"
                      title="Remover 1 unidade"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-slate-300 pt-4 text-right">
            <p className="text-xs text-slate-500 mb-1 uppercase">Total a pagar</p>
            <h3 className="text-2xl font-black tracking-tighter">
              R$ {comandaAtual ? calcularTotal(comandaAtual.itens_comanda).toFixed(2) : "0.00"}
            </h3>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-3 mt-4 text-xs">
            <p className="text-slate-500">Forma de Pagamento:</p>
            <p className="font-bold uppercase text-sm mt-1">{formaPagamento}</p>
          </div>
          
          <div className="text-center mt-8 text-xs border-t-2 border-dashed border-slate-300 pt-6 pb-4 print:pb-0 text-slate-500">
            <p className="font-bold text-black mb-1">Obrigado pela preferência!</p>
            <p>Volte sempre.</p>
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 p-6 z-10 print:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Selecione o Pagamento</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button 
              onClick={() => setFormaPagamento("Dinheiro")} 
              className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${formaPagamento === "Dinheiro" ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300"}`}
            >
              💵 Dinheiro
            </button>
            <button 
              onClick={() => setFormaPagamento("Cartão")} 
              className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${formaPagamento === "Cartão" ? "bg-blue-500 border-blue-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"}`}
            >
              💳 Cartão
            </button>
            <button 
              onClick={() => setFormaPagamento("Pix")} 
              className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${formaPagamento === "Pix" ? "bg-teal-500 border-teal-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-teal-300"}`}
            >
              💠 Pix
            </button>
          </div>

          <button 
            onClick={() => window.print()} 
            className="w-full bg-slate-900 text-amber-500 font-black tracking-widest py-4 rounded-xl hover:bg-slate-800 shadow-xl mb-3 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span className="text-xl">🖨️</span> IMPRIMIR CONTA
          </button>
        </div>
      </div>
      
    </div>
  );
}