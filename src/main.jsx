
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ShieldCheck, UserPlus, PackagePlus, ClipboardCheck, Download, PenLine, Trash2, UserX, SearchCheck } from 'lucide-react'
import './style.css'

const colaboradoresIniciais = [
  { id: 'COL-001', nome: 'João Silva', funcao: 'Operador de Secador', setor: 'Armazém', status: 'ativo', desligadoEm: '' },
  { id: 'COL-002', nome: 'Maria Santos', funcao: 'Auxiliar Operacional', setor: 'Silo', status: 'ativo', desligadoEm: '' },
]

const estoqueInicial = [
  { id: 'EPI-001', nome: 'Respirador descartável PFF2', ca: '12345', validadeCA: '', unidade: 'Unidade', quantidade: 120, minimo: 30 },
  { id: 'EPI-002', nome: 'Luva de vaqueta', ca: '67890', validadeCA: '', unidade: 'Par', quantidade: 40, minimo: 10 },
]

function gerarId(prefixo, tamanho) {
  return `${prefixo}-${String(tamanho + 1).padStart(3, '0')}`
}

function statusCA(validadeCA) {
  if (!validadeCA) return { texto: 'Sem validade informada', classe: 'semdata' }
  const hoje = new Date()
  hoje.setHours(0,0,0,0)
  const validade = new Date(validadeCA + 'T00:00:00')
  if (validade < hoje) return { texto: 'CA vencido', classe: 'vencido' }
  return { texto: 'CA válido', classe: 'valido' }
}

function abrirConsultaCA(ca) {
  const numero = String(ca || '').replace(/\D/g, '')
  const url = numero
    ? `https://caepi.mte.gov.br/internet/consultacainternet.aspx`
    : 'https://caepi.mte.gov.br/internet/consultacainternet.aspx'
  window.open(url, '_blank', 'noopener,noreferrer')
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
    const p = posicao(e, r.canvas)
    r.canvas.setPointerCapture?.(e.pointerId)
    r.ctx.beginPath()
    r.ctx.moveTo(p.x, p.y)
    setDesenhando(true)
  }

  function mover(e) {
    if (!desenhando) return
    const r = contexto()
    if (!r) return
    e.preventDefault()
    const p = posicao(e, r.canvas)
    r.ctx.lineWidth = 2
    r.ctx.lineCap = 'round'
    r.ctx.lineJoin = 'round'
    r.ctx.lineTo(p.x, p.y)
    r.ctx.stroke()
    setTemAssinatura(true)
  }

  function parar(e) {
    canvasRef.current?.releasePointerCapture?.(e.pointerId)
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
      <canvas
        ref={canvasRef}
        width="760"
        height="180"
        className="assinatura"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={parar}
        onPointerCancel={parar}
        onPointerLeave={parar}
      />
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
        <thead>
          <tr>
            <th>EPI</th>
            <th>CA</th>
            <th>Validade CA</th>
            <th>Unidade</th>
            <th>Saldo</th>
            <th>Estoque</th>
            <th>Situação CA</th>
            <th className="acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          {estoque.map(item => {
            const caStatus = statusCA(item.validadeCA)
            return (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.ca}</td>
                <td>{item.validadeCA ? item.validadeCA.split('-').reverse().join('/') : 'Não informada'}</td>
                <td>{item.unidade}</td>
                <td>{item.quantidade}</td>
                <td>{Number(item.quantidade) <= Number(item.minimo) ? <span className="baixo">Baixo</span> : <span className="ok">OK</span>}</td>
                <td><span className={caStatus.classe}>{caStatus.texto}</span></td>
                <td className="acoes">
                  <button type="button" className="secundario" onClick={() => abrirConsultaCA(item.ca)}>
                    <SearchCheck size={14}/> Consultar CA
                  </button>
                  <button type="button" className="perigo" onClick={() => excluirEpi(item.id)}>
                    <Trash2 size={14}/> Excluir
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function App() {
  const [colaboradores, setColaboradores] = useState(() => {
    const salvos = JSON.parse(localStorage.getItem('epi_colaboradores') || 'null')
    return salvos ? salvos.map(c => ({ status: 'ativo', desligadoEm: '', ...c })) : colaboradoresIniciais
  })
  const [estoque, setEstoque] = useState(() => JSON.parse(localStorage.getItem('epi_estoque') || 'null') || estoqueInicial)
  const [entregas, setEntregas] = useState(() => JSON.parse(localStorage.getItem('epi_entregas') || 'null') || [])
  const [aba, setAba] = useState('entrega')
  const [subAbaColaborador, setSubAbaColaborador] = useState('ativos')
  const [mensagem, setMensagem] = useState('')
  const [assinatura, setAssinatura] = useState('')
  const [colaborador, setColaborador] = useState({ nome: '', funcao: '', setor: '' })
  const [epi, setEpi] = useState({ nome: '', ca: '', validadeCA: '', unidade: 'Unidade', quantidade: '', minimo: '' })
  const [entrega, setEntrega] = useState({ colaboradorId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' })

  useEffect(() => localStorage.setItem('epi_colaboradores', JSON.stringify(colaboradores)), [colaboradores])
  useEffect(() => localStorage.setItem('epi_estoque', JSON.stringify(estoque)), [estoque])
  useEffect(() => localStorage.setItem('epi_entregas', JSON.stringify(entregas)), [entregas])

  const colaboradoresAtivos = colaboradores.filter(c => (c.status || 'ativo') === 'ativo')
  const colaboradoresDesligados = colaboradores.filter(c => c.status === 'desligado')
  const colabSelecionado = colaboradoresAtivos.find(c => c.id === entrega.colaboradorId)
  const epiSelecionado = estoque.find(e => e.id === entrega.epiId)
  const estoqueBaixo = estoque.filter(e => Number(e.quantidade) <= Number(e.minimo)).length
  const caVencidos = estoque.filter(e => statusCA(e.validadeCA).classe === 'vencido').length

  function cadastrarColaborador() {
    if (!colaborador.nome || !colaborador.funcao || !colaborador.setor) {
      setMensagem('Preencha nome, função e setor.')
      return
    }
    setColaboradores([...colaboradores, { id: gerarId('COL', colaboradores.length), ...colaborador, status: 'ativo', desligadoEm: '' }])
    setColaborador({ nome: '', funcao: '', setor: '' })
    setMensagem('Colaborador cadastrado como ativo.')
  }

  function desligarColaborador(id) {
    const pessoa = colaboradores.find(c => c.id === id)
    if (!pessoa) return
    if (!window.confirm(`Deseja desligar o colaborador "${pessoa.nome}"? Ele sairá da lista de ativos e ficará na aba de desligados.`)) return
    const hoje = new Date().toISOString().slice(0,10)
    setColaboradores(colaboradores.map(c => c.id === id ? { ...c, status: 'desligado', desligadoEm: hoje } : c))
    setMensagem('Colaborador desligado e movido para a aba de desligados.')
  }

  function reativarColaborador(id) {
    const pessoa = colaboradores.find(c => c.id === id)
    if (!pessoa) return
    if (!window.confirm(`Deseja reativar o colaborador "${pessoa.nome}"?`)) return
    setColaboradores(colaboradores.map(c => c.id === id ? { ...c, status: 'ativo', desligadoEm: '' } : c))
    setMensagem('Colaborador reativado e movido para a aba de ativos.')
  }

  function excluirColaborador(id) {
    const pessoa = colaboradores.find(c => c.id === id)
    if (!pessoa) return
    const possuiHistorico = entregas.some(e => e.colaborador === pessoa.nome)
    const aviso = possuiHistorico ? '\n\nAtenção: este colaborador possui histórico de entrega. O histórico será mantido.' : ''
    if (!window.confirm(`Deseja realmente excluir o colaborador "${pessoa.nome}"?${aviso}`)) return
    setColaboradores(colaboradores.filter(c => c.id !== id))
    setMensagem('Colaborador removido da lista. O histórico já registrado foi preservado.')
  }

  function cadastrarEpi() {
    if (!epi.nome || !epi.ca || !epi.quantidade) {
      setMensagem('Preencha nome do EPI, CA e quantidade.')
      return
    }
    setEstoque([...estoque, { id: gerarId('EPI', estoque.length), ...epi, quantidade: Number(epi.quantidade), minimo: Number(epi.minimo || 0) }])
    setEpi({ nome: '', ca: '', validadeCA: '', unidade: 'Unidade', quantidade: '', minimo: '' })
    setMensagem('EPI cadastrado no estoque.')
  }

  function excluirEpi(id) {
    const item = estoque.find(e => e.id === id)
    if (!item) return
    const possuiHistorico = entregas.some(e => e.epi === item.nome && e.ca === item.ca)
    const aviso = possuiHistorico ? '\n\nAtenção: este EPI possui histórico de entrega. O histórico será mantido.' : ''
    if (!window.confirm(`Deseja realmente excluir o EPI "${item.nome}" do estoque?${aviso}`)) return
    setEstoque(estoque.filter(e => e.id !== id))
    setMensagem('EPI excluído do estoque. O histórico de entregas foi preservado.')
  }

  function registrarEntrega() {
    const qtd = Number(entrega.quantidade)
    if (!colabSelecionado || !epiSelecionado || !qtd || qtd <= 0 || qtd > epiSelecionado.quantidade || !assinatura) {
      setMensagem('Verifique colaborador ativo, EPI, quantidade disponível e assinatura salva.')
      return
    }

    const registro = {
      id: `ENT-${String(entregas.length + 1).padStart(4, '0')}`,
      data: new Date().toLocaleString('pt-BR'),
      colaborador: colabSelecionado.nome,
      funcao: colabSelecionado.funcao,
      setor: colabSelecionado.setor,
      epi: epiSelecionado.nome,
      ca: epiSelecionado.ca,
      validadeCA: epiSelecionado.validadeCA,
      situacaoCA: statusCA(epiSelecionado.validadeCA).texto,
      unidade: epiSelecionado.unidade,
      quantidade: qtd,
      motivo: entrega.motivo,
      assinatura
    }

    setEntregas([registro, ...entregas])
    setEstoque(estoque.map(item => item.id === epiSelecionado.id ? { ...item, quantidade: item.quantidade - qtd } : item))
    setEntrega({ colaboradorId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' })
    setAssinatura('')
    setMensagem('Entrega registrada e estoque baixado automaticamente.')
  }

  function exportarCSV() {
    const header = 'ID;Data;Colaborador;Função;Setor;EPI;CA;Validade CA;Situação CA;Unidade;Quantidade;Motivo\n'
    const linhas = entregas.map(e => `${e.id};${e.data};${e.colaborador};${e.funcao};${e.setor};${e.epi};${e.ca};${e.validadeCA || ''};${e.situacaoCA || ''};${e.unidade || ''};${e.quantidade};${e.motivo}`).join('\n')
    const blob = new Blob([header + linhas], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'controle_entrega_epi_weisul.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main>
      <header className="topo">
        <div className="logo-area">
          <img src="/weisul-logo.png" alt="Logo Weisul Agro" className="logo" />
          <div>
            <h1>Sistema de Controle de Entrega de EPI</h1>
            <p>Weisul Agro • Estoque, entrega, assinatura eletrônica, colaboradores ativos/desligados e controle de validade do CA.</p>
          </div>
        </div>
        <ShieldCheck size={52} color="#5AAA54"/>
      </header>

      {mensagem && <div className="mensagem">{mensagem}</div>}

      <section className="cards">
        <div className="card"><span>Ativos</span><strong>{colaboradoresAtivos.length}</strong></div>
        <div className="card"><span>Desligados</span><strong>{colaboradoresDesligados.length}</strong></div>
        <div className="card"><span>Itens em estoque</span><strong>{estoque.length}</strong></div>
        <div className="card"><span>Entregas</span><strong>{entregas.length}</strong></div>
        <div className="card"><span>CA vencido</span><strong>{caVencidos}</strong></div>
      </section>

      <nav className="abas">
        <button onClick={() => setAba('entrega')} className={aba === 'entrega' ? 'ativo' : ''}>Entrega</button>
        <button onClick={() => setAba('estoque')} className={aba === 'estoque' ? 'ativo' : ''}>Estoque</button>
        <button onClick={() => setAba('colaboradores')} className={aba === 'colaboradores' ? 'ativo' : ''}>Colaboradores</button>
        <button onClick={() => setAba('historico')} className={aba === 'historico' ? 'ativo' : ''}>Histórico</button>
      </nav>

      {aba === 'entrega' && (
        <section className="painel">
          <h2>Registrar entrega de EPI</h2>
          <div className="grid4">
            <select value={entrega.colaboradorId} onChange={e => setEntrega({ ...entrega, colaboradorId: e.target.value })}>
              <option value="">Selecione o colaborador ativo</option>
              {colaboradoresAtivos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={entrega.epiId} onChange={e => setEntrega({ ...entrega, epiId: e.target.value })}>
              <option value="">Selecione o EPI</option>
              {estoque.map(e => <option key={e.id} value={e.id}>{e.nome} - {e.unidade} - saldo {e.quantidade}</option>)}
            </select>
            <input type="number" min="1" placeholder="Quantidade" value={entrega.quantidade} onChange={e => setEntrega({ ...entrega, quantidade: e.target.value })}/>
            <input placeholder="Motivo" value={entrega.motivo} onChange={e => setEntrega({ ...entrega, motivo: e.target.value })}/>
          </div>

          {colabSelecionado && epiSelecionado && (
            <div className="resumo">
              <b>Colaborador:</b> {colabSelecionado.nome} | <b>Função:</b> {colabSelecionado.funcao} | <b>Setor:</b> {colabSelecionado.setor}<br/>
              <b>EPI:</b> {epiSelecionado.nome} | <b>CA:</b> {epiSelecionado.ca} | <b>Unidade:</b> {epiSelecionado.unidade} | <b>Saldo:</b> {epiSelecionado.quantidade}<br/>
              <b>Situação do CA:</b> <span className={statusCA(epiSelecionado.validadeCA).classe}>{statusCA(epiSelecionado.validadeCA).texto}</span>
            </div>
          )}

          <h3>Assinatura eletrônica do colaborador</h3>
          <Assinatura aoSalvar={setAssinatura}/>
          {assinatura && <span className="badge">Assinatura capturada</span>}
          <br/>
          <button onClick={registrarEntrega}><ClipboardCheck size={16}/> Confirmar entrega e baixar estoque</button>
        </section>
      )}

      {aba === 'estoque' && (
        <section className="painel">
          <h2>Cadastrar EPI no estoque</h2>
          <div className="grid6">
            <input placeholder="Nome do EPI" value={epi.nome} onChange={e => setEpi({ ...epi, nome: e.target.value })}/>
            <input placeholder="Nº do CA" value={epi.ca} onChange={e => setEpi({ ...epi, ca: e.target.value })}/>
            <input type="date" title="Validade do CA" value={epi.validadeCA} onChange={e => setEpi({ ...epi, validadeCA: e.target.value })}/>
            <select value={epi.unidade} onChange={e => setEpi({ ...epi, unidade: e.target.value })}>
              <option value="Unidade">Unidade</option>
              <option value="Par">Par</option>
              <option value="Caixa">Caixa</option>
            </select>
            <input type="number" placeholder="Quantidade" value={epi.quantidade} onChange={e => setEpi({ ...epi, quantidade: e.target.value })}/>
            <input type="number" placeholder="Estoque mínimo" value={epi.minimo} onChange={e => setEpi({ ...epi, minimo: e.target.value })}/>
          </div>
          <div className="linha">
            <button onClick={cadastrarEpi}><PackagePlus size={16}/> Adicionar ao estoque</button>
            <button className="secundario" onClick={() => abrirConsultaCA(epi.ca)}><SearchCheck size={16}/> Consultar CA no CAEPI</button>
          </div>
          <TabelaEstoque estoque={estoque} excluirEpi={excluirEpi}/>
        </section>
      )}

      {aba === 'colaboradores' && (
        <section className="painel">
          <h2>Cadastrar colaborador</h2>
          <div className="grid3">
            <input placeholder="Nome completo" value={colaborador.nome} onChange={e => setColaborador({ ...colaborador, nome: e.target.value })}/>
            <input placeholder="Função" value={colaborador.funcao} onChange={e => setColaborador({ ...colaborador, funcao: e.target.value })}/>
            <input placeholder="Setor" value={colaborador.setor} onChange={e => setColaborador({ ...colaborador, setor: e.target.value })}/>
          </div>
          <button onClick={cadastrarColaborador}><UserPlus size={16}/> Cadastrar colaborador ativo</button>

          <div className="subabas">
            <button onClick={() => setSubAbaColaborador('ativos')} className={subAbaColaborador === 'ativos' ? 'ativo' : ''}>Colaboradores ativos ({colaboradoresAtivos.length})</button>
            <button onClick={() => setSubAbaColaborador('desligados')} className={subAbaColaborador === 'desligados' ? 'ativo' : ''}>Colaboradores desligados ({colaboradoresDesligados.length})</button>
          </div>

          {subAbaColaborador === 'ativos' && (
            <div className="lista">
              {colaboradoresAtivos.map(c => (
                <div className="item" key={c.id}>
                  <div className="linha espacada">
                    <div><b>{c.nome}</b><br/><span>{c.funcao} • {c.setor}</span></div>
                    <div className="linha">
                      <button type="button" className="alerta" onClick={() => desligarColaborador(c.id)}><UserX size={14}/> Desligar</button>
                      <button type="button" className="perigo" onClick={() => excluirColaborador(c.id)}><Trash2 size={14}/> Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {subAbaColaborador === 'desligados' && (
            <div className="lista">
              {colaboradoresDesligados.length === 0 && <p>Nenhum colaborador desligado.</p>}
              {colaboradoresDesligados.map(c => (
                <div className="item" key={c.id}>
                  <div className="linha espacada">
                    <div><b>{c.nome}</b> <span className="desligado">Desligado</span><br/><span>{c.funcao} • {c.setor} • desligado em {c.desligadoEm ? c.desligadoEm.split('-').reverse().join('/') : 'data não informada'}</span></div>
                    <div className="linha">
                      <button type="button" className="secundario" onClick={() => reativarColaborador(c.id)}>Reativar</button>
                      <button type="button" className="perigo" onClick={() => excluirColaborador(c.id)}><Trash2 size={14}/> Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {aba === 'historico' && (
        <section className="painel">
          <div className="linha espacada">
            <h2>Histórico de entregas</h2>
            <button className="secundario" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button>
          </div>
          {entregas.length === 0 && <p>Nenhuma entrega registrada.</p>}
          <div className="lista">
            {entregas.map(e => (
              <div className="item historico" key={e.id}>
                <div>
                  <b>{e.colaborador}</b><br/>
                  <span>{e.data} • {e.funcao} • {e.setor}</span><br/>
                  <span><b>EPI:</b> {e.epi} | <b>CA:</b> {e.ca} | <b>Situação CA:</b> {e.situacaoCA || 'Não registrada'} | <b>Qtd:</b> {e.quantidade} {e.unidade}</span>
                </div>
                {e.assinatura && <img src={e.assinatura} alt="Assinatura"/>}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer>
        <b>Observação técnica:</b> a consulta pública oficial do CA é realizada no CAEPI/MTE. Esta versão abre o portal de consulta e controla internamente a validade informada no cadastro do EPI. Para consulta automática em tempo real, é necessário backend/API intermediária com fonte oficial ou serviço contratado.
      </footer>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
