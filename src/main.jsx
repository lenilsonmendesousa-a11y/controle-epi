
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ShieldCheck, UserPlus, PackagePlus, ClipboardCheck, Download, PenLine, Trash2, UserX, SearchCheck, Fingerprint, FileText, RotateCcw } from 'lucide-react'
import './style.css'

const colaboradoresIniciais = [
  { id: 'COL-001', nome: 'João Silva', funcao: 'Operador de Secador', setor: 'Armazém', status: 'ativo', desligadoEm: '', biometria: null },
  { id: 'COL-002', nome: 'Maria Santos', funcao: 'Auxiliar Operacional', setor: 'Silo', status: 'ativo', desligadoEm: '', biometria: null },
]
const estoqueInicial = [
  { id: 'EPI-001', nome: 'Respirador descartável PFF2', ca: '12345', validadeCA: '', unidade: 'Unidade', quantidade: 120, minimo: 30 },
  { id: 'EPI-002', nome: 'Luva de vaqueta', ca: '67890', validadeCA: '', unidade: 'Par', quantidade: 40, minimo: 10 },
]
const baseLegal = `Declaro para os devidos fins que recebi da empresa os Equipamentos de Proteção Individual relacionados nesta ficha, comprometendo-me a utilizá-los apenas para a finalidade a que se destinam, conservá-los adequadamente, comunicar qualquer dano ou extravio e devolvê-los quando solicitado. Base legal: NR-6 – Equipamento de Proteção Individual, especialmente quanto ao fornecimento gratuito, orientação, exigência de uso, guarda, conservação e registro de fornecimento; CLT, art. 157, quanto ao dever da empresa de cumprir e fazer cumprir as normas de segurança e medicina do trabalho; e CLT, art. 158, quanto ao dever do empregado de observar as normas de segurança e utilizar corretamente os EPIs fornecidos.`

function gerarId(prefixo, tamanho){ return `${prefixo}-${String(tamanho + 1).padStart(3, '0')}` }
function hojeISO(){ return new Date().toISOString().slice(0,10) }
function dataBR(data){ return data ? data.split('-').reverse().join('/') : 'Não informada' }
function statusCA(validadeCA){ if(!validadeCA)return{texto:'Sem validade informada',classe:'semdata'}; const h=new Date(); h.setHours(0,0,0,0); const v=new Date(validadeCA+'T00:00:00'); return v<h?{texto:'CA vencido',classe:'vencido'}:{texto:'CA válido',classe:'valido'} }
function abrirConsultaCA(){ window.open('https://caepi.mte.gov.br/internet/consultacainternet.aspx','_blank','noopener,noreferrer') }

function Assinatura({ aoSalvar }) {
  const canvasRef = useRef(null)
  const [desenhando,setDesenhando]=useState(false)
  const [temAssinatura,setTemAssinatura]=useState(false)
  function contexto(){ const canvas=canvasRef.current; if(!canvas)return null; const ctx=canvas.getContext('2d'); if(!ctx)return null; return{canvas,ctx} }
  function posicao(e,canvas){ const r=canvas.getBoundingClientRect(); return{x:e.clientX-r.left,y:e.clientY-r.top} }
  function iniciar(e){ const r=contexto(); if(!r)return; e.preventDefault(); const p=posicao(e,r.canvas); r.canvas.setPointerCapture?.(e.pointerId); r.ctx.beginPath(); r.ctx.moveTo(p.x,p.y); setDesenhando(true) }
  function mover(e){ if(!desenhando)return; const r=contexto(); if(!r)return; e.preventDefault(); const p=posicao(e,r.canvas); r.ctx.lineWidth=2; r.ctx.lineCap='round'; r.ctx.lineJoin='round'; r.ctx.lineTo(p.x,p.y); r.ctx.stroke(); setTemAssinatura(true) }
  function parar(e){ canvasRef.current?.releasePointerCapture?.(e.pointerId); setDesenhando(false) }
  function limpar(){ const r=contexto(); if(!r)return; r.ctx.clearRect(0,0,r.canvas.width,r.canvas.height); setTemAssinatura(false); aoSalvar('') }
  function salvar(){ const c=canvasRef.current; if(!c||!temAssinatura)return; aoSalvar(c.toDataURL('image/png')) }
  return <div><canvas ref={canvasRef} width="760" height="180" className="assinatura" onPointerDown={iniciar} onPointerMove={mover} onPointerUp={parar} onPointerCancel={parar} onPointerLeave={parar}/><div className="linha"><button className="secundario" onClick={limpar}>Limpar assinatura</button><button onClick={salvar} disabled={!temAssinatura}><PenLine size={16}/> Salvar assinatura</button></div></div>
}

function App(){
  const [colaboradores,setColaboradores]=useState(()=>{const s=JSON.parse(localStorage.getItem('epi_colaboradores')||'null'); return s?s.map(c=>({status:'ativo',desligadoEm:'',biometria:null,...c})):colaboradoresIniciais})
  const [estoque,setEstoque]=useState(()=>JSON.parse(localStorage.getItem('epi_estoque')||'null')||estoqueInicial)
  const [entregas,setEntregas]=useState(()=>JSON.parse(localStorage.getItem('epi_entregas')||'null')||[])
  const [aba,setAba]=useState('entrega')
  const [subAbaColaborador,setSubAbaColaborador]=useState('ativos')
  const [mensagem,setMensagem]=useState('')
  const [assinatura,setAssinatura]=useState('')
  const [biometriaConfirmada,setBiometriaConfirmada]=useState(false)
  const [colaborador,setColaborador]=useState({nome:'',funcao:'',setor:''})
  const [epi,setEpi]=useState({nome:'',ca:'',validadeCA:'',unidade:'Unidade',quantidade:'',minimo:''})
  const [entrega,setEntrega]=useState({colaboradorId:'',epiId:'',quantidade:'1',movimento:'Entrega de EPI'})

  useEffect(()=>localStorage.setItem('epi_colaboradores',JSON.stringify(colaboradores)),[colaboradores])
  useEffect(()=>localStorage.setItem('epi_estoque',JSON.stringify(estoque)),[estoque])
  useEffect(()=>localStorage.setItem('epi_entregas',JSON.stringify(entregas)),[entregas])

  const ativos=colaboradores.filter(c=>(c.status||'ativo')==='ativo')
  const desligados=colaboradores.filter(c=>c.status==='desligado')
  const colabSelecionado=ativos.find(c=>c.id===entrega.colaboradorId)
  const epiSelecionado=estoque.find(e=>e.id===entrega.epiId)
  const estoqueBaixo=estoque.filter(e=>Number(e.quantidade)<=Number(e.minimo)).length
  const caVencidos=estoque.filter(e=>statusCA(e.validadeCA).classe==='vencido').length
  const historicoPorColaborador=useMemo(()=>colaboradores.map(c=>({colaborador:c,registros:entregas.filter(e=>e.colaboradorId===c.id || e.colaborador===c.nome)})).filter(x=>x.registros.length>0),[colaboradores,entregas])

  function cadastrarColaborador(){ if(!colaborador.nome||!colaborador.funcao||!colaborador.setor){setMensagem('Preencha nome, função e setor.');return} setColaboradores([...colaboradores,{id:gerarId('COL',colaboradores.length),...colaborador,status:'ativo',desligadoEm:'',biometria:null}]); setColaborador({nome:'',funcao:'',setor:''}); setMensagem('Colaborador cadastrado como ativo.') }
  function cadastrarBiometria(id){ const pessoa=colaboradores.find(c=>c.id===id); if(!pessoa)return; if(!window.confirm(`Cadastrar biometria digital para ${pessoa.nome}?\\n\\nNesta versão web, o cadastro fica preparado/simulado. Para coletor físico será necessário integrar o SDK do fabricante.`))return; const template=`BIO-${id}-${Date.now()}`; setColaboradores(colaboradores.map(c=>c.id===id?{...c,biometria:{id:template,cadastradaEm:new Date().toLocaleString('pt-BR'),metodo:'Leitor biométrico / simulado'}}:c)); setMensagem('Biometria digital cadastrada/preparada para o colaborador.') }
  function confirmarBiometria(){ if(!colabSelecionado){setMensagem('Selecione um colaborador ativo para confirmar a biometria.');return} if(!colabSelecionado.biometria){setMensagem('Este colaborador ainda não possui biometria cadastrada.');return} if(!window.confirm(`Confirmar biometria digital de ${colabSelecionado.nome}?\\n\\nPara leitor físico, esta ação deverá chamar o SDK do equipamento.`))return; setBiometriaConfirmada(true); setMensagem('Biometria confirmada para este registro.') }
  function desligarColaborador(id){ const p=colaboradores.find(c=>c.id===id); if(!p)return; if(!window.confirm(`Deseja desligar o colaborador "${p.nome}"?`))return; setColaboradores(colaboradores.map(c=>c.id===id?{...c,status:'desligado',desligadoEm:hojeISO()}:c)); setMensagem('Colaborador desligado e movido para a aba de desligados.') }
  function reativarColaborador(id){ const p=colaboradores.find(c=>c.id===id); if(!p)return; if(!window.confirm(`Deseja reativar "${p.nome}"?`))return; setColaboradores(colaboradores.map(c=>c.id===id?{...c,status:'ativo',desligadoEm:''}:c)); setMensagem('Colaborador reativado.') }
  function excluirColaborador(id){ const p=colaboradores.find(c=>c.id===id); if(!p)return; const aviso=entregas.some(e=>e.colaboradorId===id||e.colaborador===p.nome)?'\\n\\nAtenção: há histórico de entrega. O histórico será mantido.':''; if(!window.confirm(`Deseja excluir "${p.nome}"?${aviso}`))return; setColaboradores(colaboradores.filter(c=>c.id!==id)); setMensagem('Colaborador removido da lista. Histórico preservado.') }

  function cadastrarEpi(){ if(!epi.nome||!epi.ca||!epi.quantidade){setMensagem('Preencha nome do EPI, CA e quantidade.');return} setEstoque([...estoque,{id:gerarId('EPI',estoque.length),...epi,quantidade:Number(epi.quantidade),minimo:Number(epi.minimo||0)}]); setEpi({nome:'',ca:'',validadeCA:'',unidade:'Unidade',quantidade:'',minimo:''}); setMensagem('EPI cadastrado no estoque.') }
  function excluirEpi(id){ const item=estoque.find(e=>e.id===id); if(!item)return; const aviso=entregas.some(e=>e.epiId===id || (e.epi===item.nome&&e.ca===item.ca))?'\\n\\nAtenção: há histórico. O histórico será mantido.':''; if(!window.confirm(`Deseja excluir o EPI "${item.nome}"?${aviso}`))return; setEstoque(estoque.filter(e=>e.id!==id)); setMensagem('EPI excluído. Histórico preservado.') }

  function registrarMovimento(){
    const qtd=Number(entrega.quantidade)
    if(!colabSelecionado||!epiSelecionado||!qtd||qtd<=0||!assinatura){setMensagem('Verifique colaborador, EPI, quantidade e assinatura eletrônica.');return}
    if(entrega.movimento==='Entrega de EPI' && qtd>epiSelecionado.quantidade){setMensagem('Quantidade indisponível em estoque para entrega.');return}
    const st=statusCA(epiSelecionado.validadeCA)
    const registro={id:`MOV-${String(entregas.length+1).padStart(4,'0')}`,data:new Date().toLocaleString('pt-BR'),colaboradorId:colabSelecionado.id,colaborador:colabSelecionado.nome,funcao:colabSelecionado.funcao,setor:colabSelecionado.setor,epiId:epiSelecionado.id,epi:epiSelecionado.nome,ca:epiSelecionado.ca,validadeCA:epiSelecionado.validadeCA,situacaoCA:st.texto,unidade:epiSelecionado.unidade,quantidade:qtd,movimento:entrega.movimento,assinatura,biometria:biometriaConfirmada?{confirmada:true,data:new Date().toLocaleString('pt-BR'),templateId:colabSelecionado.biometria?.id||''}:null}
    setEntregas([registro,...entregas])
    setEstoque(estoque.map(item=>item.id===epiSelecionado.id?{...item,quantidade: entrega.movimento==='Entrega de EPI'? item.quantidade-qtd : item.quantidade+qtd}:item))
    setEntrega({colaboradorId:'',epiId:'',quantidade:'1',movimento:'Entrega de EPI'})
    setAssinatura(''); setBiometriaConfirmada(false)
    setMensagem(`${registro.movimento} registrada com sucesso.`)
  }

  function exportarCSV(){
    const header='ID;Data;Movimento;Colaborador;Função;Setor;EPI;CA;Validade CA;Situação CA;Unidade;Quantidade;Biometria\\n'
    const linhas=entregas.map(e=>`${e.id};${e.data};${e.movimento||'Entrega de EPI'};${e.colaborador};${e.funcao};${e.setor};${e.epi};${e.ca};${e.validadeCA||''};${e.situacaoCA||''};${e.unidade||''};${e.quantidade};${e.biometria?.confirmada?'Sim':'Não'}`).join('\\n')
    const blob=new Blob([header+linhas],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='historico_epi_por_colaborador.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function gerarFicha(colaboradorFicha, registros){
    const linhas=registros.map(r=>`<tr><td>${r.data}</td><td>${r.movimento||'Entrega de EPI'}</td><td>${r.epi}</td><td>${r.ca}</td><td>${dataBR(r.validadeCA)}</td><td>${r.situacaoCA||''}</td><td>${r.quantidade} ${r.unidade||''}</td><td>${r.biometria?.confirmada?'Biometria confirmada':'-'}</td><td>${r.assinatura?'<img src="'+r.assinatura+'" style="max-width:140px;max-height:55px"/>':'-'}</td></tr>`).join('')
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Ficha de EPI - ${colaboradorFicha.nome}</title><style>body{font-family:Arial;padding:24px;color:#17301B}h1{color:#2F7D32}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #999;padding:6px;vertical-align:middle}th{background:#2F7D32;color:white}.termo{border:1px solid #999;padding:10px;margin:12px 0;font-size:12px;line-height:1.4}.cab{display:flex;justify-content:space-between;align-items:center}.logo{width:140px}</style></head><body><div class="cab"><img class="logo" src="/weisul-logo.png"/><h1>Ficha de Entrega/Devolução de EPI</h1></div><p><b>Colaborador:</b> ${colaboradorFicha.nome}<br><b>Função:</b> ${colaboradorFicha.funcao}<br><b>Setor:</b> ${colaboradorFicha.setor}<br><b>Status:</b> ${colaboradorFicha.status||'ativo'}</p><div class="termo"><b>Base legal e termo de responsabilidade:</b><br>${baseLegal}</div><table><thead><tr><th>Data</th><th>Movimento</th><th>EPI</th><th>CA</th><th>Validade CA</th><th>Situação CA</th><th>Qtd.</th><th>Biometria</th><th>Assinatura</th></tr></thead><tbody>${linhas}</tbody></table><br><p>Documento gerado eletronicamente pelo Sistema de Controle de EPI - Weisul Agro.</p></body></html>`
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500)
  }

  return <main>
    <header className="topo"><div className="logo-area"><img src="/weisul-logo.png" alt="Logo Weisul Agro" className="logo"/><div><h1>Sistema de Controle de Entrega de EPI</h1><p>Weisul Agro • Histórico individual, ficha de EPI, entrega/devolução, assinatura eletrônica e biometria.</p></div></div><ShieldCheck size={52} color="#5AAA54"/></header>
    {mensagem&&<div className="mensagem">{mensagem}</div>}
    <section className="cards"><div className="card"><span>Ativos</span><strong>{ativos.length}</strong></div><div className="card"><span>Desligados</span><strong>{desligados.length}</strong></div><div className="card"><span>Itens em estoque</span><strong>{estoque.length}</strong></div><div className="card"><span>Movimentos</span><strong>{entregas.length}</strong></div><div className="card"><span>CA vencido</span><strong>{caVencidos}</strong></div></section>
    <nav className="abas"><button onClick={()=>setAba('entrega')} className={aba==='entrega'?'ativo':''}>Registro</button><button onClick={()=>setAba('estoque')} className={aba==='estoque'?'ativo':''}>Estoque</button><button onClick={()=>setAba('colaboradores')} className={aba==='colaboradores'?'ativo':''}>Colaboradores</button><button onClick={()=>setAba('historico')} className={aba==='historico'?'ativo':''}>Histórico / Ficha</button></nav>

    {aba==='entrega'&&<section className="painel"><h2>Registrar entrega ou devolução de EPI</h2><div className="grid4"><select value={entrega.colaboradorId} onChange={e=>{setEntrega({...entrega,colaboradorId:e.target.value});setBiometriaConfirmada(false)}}><option value="">Selecione o colaborador ativo</option>{ativos.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><select value={entrega.epiId} onChange={e=>setEntrega({...entrega,epiId:e.target.value})}><option value="">Selecione o EPI</option>{estoque.map(e=><option key={e.id} value={e.id}>{e.nome} - {e.unidade} - saldo {e.quantidade}</option>)}</select><input type="number" min="1" placeholder="Quantidade" value={entrega.quantidade} onChange={e=>setEntrega({...entrega,quantidade:e.target.value})}/><select value={entrega.movimento} onChange={e=>setEntrega({...entrega,movimento:e.target.value})}><option value="Entrega de EPI">Entrega de EPI</option><option value="Devolução de EPI">Devolução de EPI</option></select></div>{colabSelecionado&&epiSelecionado&&<div className="resumo"><b>Colaborador:</b> {colabSelecionado.nome} | <b>Função:</b> {colabSelecionado.funcao} | <b>Setor:</b> {colabSelecionado.setor}<br/><b>EPI:</b> {epiSelecionado.nome} | <b>CA:</b> {epiSelecionado.ca} | <b>Unidade:</b> {epiSelecionado.unidade} | <b>Saldo:</b> {epiSelecionado.quantidade}<br/><b>Situação CA:</b> <span className={statusCA(epiSelecionado.validadeCA).classe}>{statusCA(epiSelecionado.validadeCA).texto}</span> {colabSelecionado.biometria?<span className="bio">Biometria cadastrada</span>:<span className="semdata">Sem biometria</span>}</div>}<h3>Assinatura do recebimento/devolução</h3><Assinatura aoSalvar={setAssinatura}/>{assinatura&&<span className="badge">Assinatura eletrônica capturada</span>}<div className="linha"><button className="azul" onClick={confirmarBiometria}><Fingerprint size={16}/> Colher/confirmar biometria</button>{biometriaConfirmada&&<span className="bio">Biometria confirmada neste registro</span>}<button onClick={registrarMovimento}><ClipboardCheck size={16}/> Confirmar registro</button></div></section>}

    {aba==='estoque'&&<section className="painel"><h2>Cadastrar EPI no estoque</h2><div className="grid6"><input placeholder="Nome do EPI" value={epi.nome} onChange={e=>setEpi({...epi,nome:e.target.value})}/><input placeholder="Nº do CA" value={epi.ca} onChange={e=>setEpi({...epi,ca:e.target.value})}/><input type="date" title="Validade do CA" value={epi.validadeCA} onChange={e=>setEpi({...epi,validadeCA:e.target.value})}/><select value={epi.unidade} onChange={e=>setEpi({...epi,unidade:e.target.value})}><option value="Unidade">Unidade</option><option value="Par">Par</option><option value="Caixa">Caixa</option></select><input type="number" placeholder="Quantidade" value={epi.quantidade} onChange={e=>setEpi({...epi,quantidade:e.target.value})}/><input type="number" placeholder="Estoque mínimo" value={epi.minimo} onChange={e=>setEpi({...epi,minimo:e.target.value})}/></div><div className="linha"><button onClick={cadastrarEpi}><PackagePlus size={16}/> Adicionar ao estoque</button><button className="secundario" onClick={abrirConsultaCA}><SearchCheck size={16}/> Consultar CA no CAEPI</button></div><div className="tabela"><table><thead><tr><th>EPI</th><th>CA</th><th>Validade CA</th><th>Unidade</th><th>Saldo</th><th>Estoque</th><th>Situação CA</th><th className="acoes">Ações</th></tr></thead><tbody>{estoque.map(item=>{const st=statusCA(item.validadeCA);return <tr key={item.id}><td>{item.nome}</td><td>{item.ca}</td><td>{dataBR(item.validadeCA)}</td><td>{item.unidade}</td><td>{item.quantidade}</td><td>{Number(item.quantidade)<=Number(item.minimo)?<span className="baixo">Baixo</span>:<span className="ok">OK</span>}</td><td><span className={st.classe}>{st.texto}</span></td><td className="acoes"><button className="secundario mini" onClick={abrirConsultaCA}><SearchCheck size={14}/> Consultar</button><button className="perigo mini" onClick={()=>excluirEpi(item.id)}><Trash2 size={14}/> Excluir</button></td></tr>})}</tbody></table></div></section>}

    {aba==='colaboradores'&&<section className="painel"><h2>Cadastrar colaborador</h2><div className="grid3"><input placeholder="Nome completo" value={colaborador.nome} onChange={e=>setColaborador({...colaborador,nome:e.target.value})}/><input placeholder="Função" value={colaborador.funcao} onChange={e=>setColaborador({...colaborador,funcao:e.target.value})}/><input placeholder="Setor" value={colaborador.setor} onChange={e=>setColaborador({...colaborador,setor:e.target.value})}/></div><button onClick={cadastrarColaborador}><UserPlus size={16}/> Cadastrar colaborador ativo</button><div className="subabas"><button onClick={()=>setSubAbaColaborador('ativos')} className={subAbaColaborador==='ativos'?'ativo':''}>Ativos ({ativos.length})</button><button onClick={()=>setSubAbaColaborador('desligados')} className={subAbaColaborador==='desligados'?'ativo':''}>Desligados ({desligados.length})</button></div>{subAbaColaborador==='ativos'&&<div className="lista">{ativos.map(c=><div className="item" key={c.id}><div className="linha espacada"><div><b>{c.nome}</b> {c.biometria?<span className="bio">Biometria cadastrada</span>:<span className="semdata">Sem biometria</span>}<br/><span>{c.funcao} • {c.setor}</span></div><div className="linha"><button className="azul mini" onClick={()=>cadastrarBiometria(c.id)}><Fingerprint size={14}/> Cadastrar biometria</button><button className="alerta mini" onClick={()=>desligarColaborador(c.id)}><UserX size={14}/> Desligar</button><button className="perigo mini" onClick={()=>excluirColaborador(c.id)}><Trash2 size={14}/> Excluir</button></div></div></div>)}</div>}{subAbaColaborador==='desligados'&&<div className="lista">{desligados.length===0&&<p>Nenhum colaborador desligado.</p>}{desligados.map(c=><div className="item" key={c.id}><div className="linha espacada"><div><b>{c.nome}</b> <span className="desligado">Desligado</span><br/><span>{c.funcao} • {c.setor} • desligado em {dataBR(c.desligadoEm)}</span></div><div className="linha"><button className="secundario mini" onClick={()=>reativarColaborador(c.id)}><RotateCcw size={14}/> Reativar</button><button className="perigo mini" onClick={()=>excluirColaborador(c.id)}><Trash2 size={14}/> Excluir</button></div></div></div>)}</div>}</section>}

    {aba==='historico'&&<section className="painel"><div className="linha espacada"><h2>Histórico separado por colaborador</h2><button className="secundario" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button></div><div className="termo"><b>Bases legais inseridas na ficha:</b><br/>{baseLegal}</div>{historicoPorColaborador.length===0&&<p>Nenhum histórico registrado.</p>}<div className="lista">{historicoPorColaborador.map(({colaborador,registros})=><div className="item" key={colaborador.id}><div className="linha espacada"><div><h3>{colaborador.nome}</h3><span>{colaborador.funcao} • {colaborador.setor} • {registros.length} registro(s)</span></div><button onClick={()=>gerarFicha(colaborador,registros)}><FileText size={16}/> Gerar ficha de EPI</button></div><div className="ficha-preview"><table><thead><tr><th>Data</th><th>Movimento</th><th>EPI</th><th>CA</th><th>Qtd.</th><th>Assinatura</th><th>Biometria</th></tr></thead><tbody>{registros.map(r=><tr key={r.id}><td>{r.data}</td><td>{r.movimento||'Entrega de EPI'}</td><td>{r.epi}</td><td>{r.ca}</td><td>{r.quantidade} {r.unidade}</td><td>{r.assinatura?<img src={r.assinatura} style={{maxWidth:120,maxHeight:45}}/>:'-'}</td><td>{r.biometria?.confirmada?'Confirmada':'-'}</td></tr>)}</tbody></table></div></div>)}</div></section>}

    <footer><b>Observação técnica:</b> para coletar biometria real com leitor físico, será necessário informar o modelo do equipamento e integrar o SDK/driver do fabricante por backend, aplicativo local ou ponte nativa. Esta versão já possui o fluxo do sistema preparado para cadastro e confirmação biométrica.</footer>
  </main>
}
createRoot(document.getElementById('root')).render(<App/>)
