import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ShieldCheck, UserPlus, PackagePlus, ClipboardCheck, Download, PenLine, Trash2 } from 'lucide-react'
import './style.css'

const colaboradoresIniciais = [
  { id: 'COL-001', nome: 'João Silva', funcao: 'Operador de Secador', setor: 'Armazém' },
  { id: 'COL-002', nome: 'Maria Santos', funcao: 'Auxiliar Operacional', setor: 'Silo' },
]

const estoqueInicial = [
  { id: 'EPI-001', nome: 'Respirador descartável PFF2', ca: 'CA 12345', unidade: 'Unidade', quantidade: 120, minimo: 30 },
  { id: 'EPI-002', nome: 'Luva de vaqueta', ca: 'CA 67890', unidade: 'Par', quantidade: 40, minimo: 10 },
]

function gerarId(prefixo, tamanho) {
  return `${prefixo}-${String(tamanho + 1).padStart(3, '0')}`
}

function Assinatura({ aoSalvar }) {
  const canvasRef = useRef(null)
  const [desenhando, setDesenhando] = useState(false)
  const [temAssinatura, setTemAssinatura] = useState(false)

  function contexto() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return { canvas, ctx }
  }

  function posicao(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function iniciar(e) {
    const r = contexto()
    if (!r) return
    e.preventDefault()
    const { canvas, ctx } = r
    const p = posicao(e, canvas)
    canvas.setPointerCapture?.(e.pointerId)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    setDesenhando(true)
  }

  function mover(e) {
    if (!desenhando) return
    const r = contexto()
    if (!r) return
    e.preventDefault()
    const { canvas, ctx } = r
    const p = posicao(e, canvas)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setTemAssinatura(true)
  }

  function parar(e) {
    const canvas = canvasRef.current
    canvas?.releasePointerCapture?.(e.pointerId)
    setDesenhando(false)
  }

  function limpar() {
    const r = contexto()
    if (!r) return
    r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height)
    setTemAssinatura(false)
    aoSalvar('')
  }

  function salvar() {
    const canvas = canvasRef.current
    if (!canvas || !temAssinatura) return
    aoSalvar(canvas.toDataURL('image/png'))
  }

  return (
    <div>
      <canvas ref={canvasRef} width="760" height="180" className="assinatura" onPointerDown={iniciar} onPointerMove={mover} onPointerUp={parar} onPointerCancel={parar} onPointerLeave={parar} />
      <div className="linha">
        <button className="secundario" onClick={limpar}>Limpar assinatura</button>
        <button onClick={salvar} disabled={!temAssinatura}><PenLine size={16}/> Salvar assinatura</button>
      </div>
    </div>
  )
}

function TabelaEstoque({ estoque, excluirEpi }) {
  return (
    <div className="tabela">
      <table>
        <thead><tr><th>EPI</th><th>CA</th><th>Unidade</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>{estoque.map(e => <tr key={e.id}><td>{e.nome}</td><td>{e.ca}</td><td>{e.unidade}</td><td>{e.quantidade}</td><td>{Number(e.quantidade) <= Number(e.minimo) ? <span className="baixo">Baixo</span> : <span className="ok">OK</span>}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

function App() {
  const [colaboradores, setColaboradores] = useState(() => JSON.parse(localStorage.getItem('epi_colaboradores') || 'null') || colaboradoresIniciais)
  const [estoque, setEstoque] = useState(() => JSON.parse(localStorage.getItem('epi_estoque') || 'null') || estoqueInicial)
  const [entregas, setEntregas] = useState(() => JSON.parse(localStorage.getItem('epi_entregas') || 'null') || [])
  const [aba, setAba] = useState('entrega')
  const [mensagem, setMensagem] = useState('')
  const [assinatura, setAssinatura] = useState('')
  const [colaborador, setColaborador] = useState({ nome: '', funcao: '', setor: '' })
  const [epi, setEpi] = useState({ nome: '', ca: '', unidade: 'Unidade', quantidade: '', minimo: '' })
  const [entrega, setEntrega] = useState({ colaboradorId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' })

  useEffect(() => localStorage.setItem('epi_colaboradores', JSON.stringify(colaboradores)), [colaboradores])
  useEffect(() => localStorage.setItem('epi_estoque', JSON.stringify(estoque)), [estoque])
  useEffect(() => localStorage.setItem('epi_entregas', JSON.stringify(entregas)), [entregas])

  const colabSelecionado = colaboradores.find(c => c.id === entrega.colaboradorId)
  const epiSelecionado = estoque.find(e => e.id === entrega.epiId)
  const estoqueBaixo = estoque.filter(e => Number(e.quantidade) <= Number(e.minimo)).length

  function cadastrarColaborador() {
    if (!colaborador.nome || !colaborador.funcao || !colaborador.setor) { setMensagem('Preencha nome, função e setor.'); return }
    setColaboradores([...colaboradores, { id: gerarId('COL', colaboradores.length), ...colaborador }])
    setColaborador({ nome: '', funcao: '', setor: '' })
    setMensagem('Colaborador cadastrado com sucesso.')
  }

  function cadastrarEpi() {
    if (!epi.nome || !epi.ca || !epi.quantidade) { setMensagem('Preencha nome do EPI, CA e quantidade.'); return }
    setEstoque([...estoque, { id: gerarId('EPI', estoque.length), ...epi, quantidade: Number(epi.quantidade), minimo: Number(epi.minimo || 0) }])
    setEpi({ nome: '', ca: '', unidade: 'Unidade', quantidade: '', minimo: '' })
    setMensagem('EPI cadastrado no estoque.')
  }

  function excluirColaborador(id) {
    const colab = colaboradores.find(c => c.id === id)
    if (!colab) return

    const possuiHistorico = entregas.some(e => e.colaborador === colab.nome)
    if (possuiHistorico) {
      setMensagem('Este colaborador possui histórico de entrega e não pode ser excluído para preservar a rastreabilidade.')
      return
    }

    if (!confirm(`Deseja realmente excluir o colaborador ${colab.nome}?`)) return
    setColaboradores(colaboradores.filter(c => c.id !== id))
    setMensagem('Colaborador excluído com sucesso.')
  }

  function excluirEpi(id) {
    const item = estoque.find(e => e.id === id)
    if (!item) return

    const possuiHistorico = entregas.some(e => e.epi === item.nome && e.ca === item.ca)
    if (possuiHistorico) {
      setMensagem('Este EPI possui histórico de entrega e não pode ser excluído para preservar a rastreabilidade.')
      return
    }

    if (!confirm(`Deseja realmente excluir o EPI ${item.nome}?`)) return
    setEstoque(estoque.filter(e => e.id !== id))
    setMensagem('EPI excluído do estoque com sucesso.')
  }

  function registrarEntrega() {
    const qtd = Number(entrega.quantidade)
    if (!colabSelecionado || !epiSelecionado || !qtd || qtd <= 0 || qtd > epiSelecionado.quantidade || !assinatura) { setMensagem('Verifique colaborador, EPI, quantidade disponível e assinatura salva.'); return }
    const registro = { id: `ENT-${String(entregas.length + 1).padStart(4, '0')}`, data: new Date().toLocaleString('pt-BR'), colaborador: colabSelecionado.nome, funcao: colabSelecionado.funcao, setor: colabSelecionado.setor, epi: epiSelecionado.nome, ca: epiSelecionado.ca, quantidade: qtd, motivo: entrega.motivo, assinatura }
    setEntregas([registro, ...entregas])
    setEstoque(estoque.map(item => item.id === epiSelecionado.id ? { ...item, quantidade: item.quantidade - qtd } : item))
    setEntrega({ colaboradorId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' })
    setAssinatura('')
    setMensagem('Entrega registrada e estoque baixado automaticamente.')
  }

  function exportarCSV() {
    const header = 'ID;Data;Colaborador;Função;Setor;EPI;CA;Quantidade;Motivo\n'
    const linhas = entregas.map(e => `${e.id};${e.data};${e.colaborador};${e.funcao};${e.setor};${e.epi};${e.ca};${e.quantidade};${e.motivo}`).join('\n')
    const blob = new Blob([header + linhas], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'controle_entrega_epi.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <main>
      <header className="topo"><div><h1>Sistema de Controle de Entrega de EPI</h1><p>Cadastro de colaboradores, estoque, entrega, baixa automática, assinatura eletrônica e exclusão controlada.</p></div><ShieldCheck size={52}/></header>
      {mensagem && <div className="mensagem">{mensagem}</div>}
      <section className="cards"><div className="card"><span>Colaboradores</span><strong>{colaboradores.length}</strong></div><div className="card"><span>Itens em estoque</span><strong>{estoque.length}</strong></div><div className="card"><span>Entregas registradas</span><strong>{entregas.length}</strong></div><div className="card"><span>Estoque baixo</span><strong>{estoqueBaixo}</strong></div></section>
      <nav className="abas"><button onClick={() => setAba('entrega')} className={aba === 'entrega' ? 'ativo' : ''}>Entrega</button><button onClick={() => setAba('estoque')} className={aba === 'estoque' ? 'ativo' : ''}>Estoque</button><button onClick={() => setAba('colaboradores')} className={aba === 'colaboradores' ? 'ativo' : ''}>Colaboradores</button><button onClick={() => setAba('historico')} className={aba === 'historico' ? 'ativo' : ''}>Histórico</button></nav>
      {aba === 'entrega' && <section className="painel"><h2>Registrar entrega de EPI</h2><div className="grid4"><select value={entrega.colaboradorId} onChange={e => setEntrega({ ...entrega, colaboradorId: e.target.value })}><option value="">Selecione o colaborador</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select><select value={entrega.epiId} onChange={e => setEntrega({ ...entrega, epiId: e.target.value })}><option value="">Selecione o EPI</option>{estoque.map(e => <option key={e.id} value={e.id}>{e.nome} - saldo {e.quantidade}</option>)}</select><input type="number" min="1" placeholder="Quantidade" value={entrega.quantidade} onChange={e => setEntrega({ ...entrega, quantidade: e.target.value })}/><input placeholder="Motivo" value={entrega.motivo} onChange={e => setEntrega({ ...entrega, motivo: e.target.value })}/></div>{colabSelecionado && epiSelecionado && <div className="resumo"><b>Colaborador:</b> {colabSelecionado.nome} | <b>Função:</b> {colabSelecionado.funcao} | <b>Setor:</b> {colabSelecionado.setor}<br/><b>EPI:</b> {epiSelecionado.nome} | <b>CA:</b> {epiSelecionado.ca} | <b>Saldo:</b> {epiSelecionado.quantidade}</div>}<h3>Assinatura eletrônica do colaborador</h3><Assinatura aoSalvar={setAssinatura}/>{assinatura && <span className="badge">Assinatura capturada</span>}<br/><button onClick={registrarEntrega}><ClipboardCheck size={16}/> Confirmar entrega e baixar estoque</button></section>}
      {aba === 'estoque' && <section className="painel"><h2>Cadastrar EPI no estoque</h2><div className="grid5"><input placeholder="Nome do EPI" value={epi.nome} onChange={e => setEpi({ ...epi, nome: e.target.value })}/><input placeholder="Nº do CA" value={epi.ca} onChange={e => setEpi({ ...epi, ca: e.target.value })}/><input placeholder="Unidade" value={epi.unidade} onChange={e => setEpi({ ...epi, unidade: e.target.value })}/><input type="number" placeholder="Quantidade" value={epi.quantidade} onChange={e => setEpi({ ...epi, quantidade: e.target.value })}/><input type="number" placeholder="Estoque mínimo" value={epi.minimo} onChange={e => setEpi({ ...epi, minimo: e.target.value })}/></div><button onClick={cadastrarEpi}><PackagePlus size={16}/> Adicionar ao estoque</button><TabelaEstoque estoque={estoque} excluirEpi={excluirEpi}/></section>}
      {aba === 'colaboradores' && <section className="painel"><h2>Cadastrar colaborador</h2><div className="grid3"><input placeholder="Nome completo" value={colaborador.nome} onChange={e => setColaborador({ ...colaborador, nome: e.target.value })}/><input placeholder="Função" value={colaborador.funcao} onChange={e => setColaborador({ ...colaborador, funcao: e.target.value })}/><input placeholder="Setor" value={colaborador.setor} onChange={e => setColaborador({ ...colaborador, setor: e.target.value })}/></div><button onClick={cadastrarColaborador}><UserPlus size={16}/> Cadastrar colaborador</button><div className="lista">{colaboradores.map(c => (
              <div className="item" key={c.id}>
                <div className="linha espacada">
                  <div><b>{c.nome}</b><br/><span>{c.funcao} • {c.setor}</span></div>
                  <button className="perigo" onClick={() => excluirColaborador(c.id)}><Trash2 size={16}/> Excluir</button>
                </div>
              </div>
            ))}</div></section>}
      {aba === 'historico' && <section className="painel"><div className="linha espacada"><h2>Histórico de entregas</h2><button className="secundario" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button></div>{entregas.length === 0 && <p>Nenhuma entrega registrada.</p>}<div className="lista">{entregas.map(e => <div className="item historico" key={e.id}><div><b>{e.colaborador}</b><br/><span>{e.data} • {e.funcao} • {e.setor}</span><br/><span><b>EPI:</b> {e.epi} | <b>CA:</b> {e.ca} | <b>Qtd:</b> {e.quantidade}</span></div>{e.assinatura && <img src={e.assinatura} alt="Assinatura"/>}</div>)}</div></section>}
      <footer><b>Observação técnica:</b> biometria real por impressão digital exige leitor biométrico e integração própria. Este modelo usa assinatura eletrônica desenhada na tela. A exclusão é bloqueada quando já existe histórico de entrega para preservar rastreabilidade.</footer>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
