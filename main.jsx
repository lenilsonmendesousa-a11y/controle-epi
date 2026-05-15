import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, UserPlus, PackagePlus, ClipboardCheck, FileDown, PenLine } from 'lucide-react';
import './style.css';

const initialEmployees = [
  { id: 'COL-001', nome: 'João Silva', funcao: 'Operador de Secador', setor: 'Armazém' },
  { id: 'COL-002', nome: 'Maria Santos', funcao: 'Auxiliar Operacional', setor: 'Silo' },
];

const initialStock = [
  { id: 'EPI-001', nome: 'Respirador descartável PFF2', ca: 'CA 12345', unidade: 'Unidade', quantidade: 120, minimo: 30 },
  { id: 'EPI-002', nome: 'Luva de vaqueta', ca: 'CA 67890', unidade: 'Par', quantidade: 40, minimo: 10 },
];

function id(prefix, length) { return `${prefix}-${String(length + 1).padStart(3, '0')}`; }
function deliveryId(length) { return `ENT-${String(length + 1).padStart(4, '0')}`; }

function load(key, fallback) {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
  catch { return fallback; }
}

function SignaturePad({ onSave, signature }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const ctxData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  };

  const pos = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event) => {
    const data = ctxData(); if (!data) return;
    event.preventDefault();
    const { canvas, ctx } = data;
    const p = pos(event, canvas);
    canvas.setPointerCapture?.(event.pointerId);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true);
  };

  const move = (event) => {
    if (!drawing) return;
    const data = ctxData(); if (!data) return;
    event.preventDefault();
    const { canvas, ctx } = data;
    const p = pos(event, canvas);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawing(true);
  };

  const stop = (event) => { canvasRef.current?.releasePointerCapture?.(event.pointerId); setDrawing(false); };
  const clear = () => { const data = ctxData(); if (!data) return; data.ctx.clearRect(0,0,data.canvas.width,data.canvas.height); setHasDrawing(false); onSave(''); };
  const save = () => { const canvas = canvasRef.current; if (!canvas || !hasDrawing) return; onSave(canvas.toDataURL('image/png')); };

  return <div className="signature-box">
    <canvas ref={canvasRef} width="760" height="180" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} />
    <div className="row gap"><button className="secondary" onClick={clear}>Limpar assinatura</button><button onClick={save} disabled={!hasDrawing}><PenLine size={16}/> Salvar assinatura</button>{signature && <span className="badge ok">Assinatura capturada</span>}</div>
  </div>;
}

function App() {
  const [tab, setTab] = useState('entrega');
  const [employees, setEmployees] = useState(() => load('epi_employees', initialEmployees));
  const [stock, setStock] = useState(() => load('epi_stock', initialStock));
  const [deliveries, setDeliveries] = useState(() => load('epi_deliveries', []));
  const [message, setMessage] = useState('');
  const [empForm, setEmpForm] = useState({ nome: '', funcao: '', setor: '' });
  const [epiForm, setEpiForm] = useState({ nome: '', ca: '', unidade: 'Unidade', quantidade: '', minimo: '' });
  const [delivery, setDelivery] = useState({ employeeId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' });
  const [signature, setSignature] = useState('');

  useEffect(() => localStorage.setItem('epi_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('epi_stock', JSON.stringify(stock)), [stock]);
  useEffect(() => localStorage.setItem('epi_deliveries', JSON.stringify(deliveries)), [deliveries]);

  const lowStock = useMemo(() => stock.filter(i => Number(i.quantidade) <= Number(i.minimo)), [stock]);
  const employee = employees.find(e => e.id === delivery.employeeId);
  const epi = stock.find(e => e.id === delivery.epiId);

  const addEmployee = () => {
    if (!empForm.nome || !empForm.funcao || !empForm.setor) return setMessage('Preencha nome, função e setor.');
    setEmployees([...employees, { id: id('COL', employees.length), ...empForm }]);
    setEmpForm({ nome: '', funcao: '', setor: '' }); setMessage('Colaborador cadastrado com sucesso.');
  };
  const addEpi = () => {
    const q = Number(epiForm.quantidade), m = Number(epiForm.minimo || 0);
    if (!epiForm.nome || !epiForm.ca || !Number.isFinite(q)) return setMessage('Preencha nome, CA e quantidade.');
    setStock([...stock, { id: id('EPI', stock.length), ...epiForm, quantidade: q, minimo: m }]);
    setEpiForm({ nome: '', ca: '', unidade: 'Unidade', quantidade: '', minimo: '' }); setMessage('EPI cadastrado no estoque.');
  };
  const register = () => {
    const q = Number(delivery.quantidade);
    if (!employee || !epi || !signature || !q || q <= 0 || q > epi.quantidade) return setMessage('Verifique colaborador, EPI, quantidade e assinatura.');
    const record = { id: deliveryId(deliveries.length), data: new Date().toLocaleString('pt-BR'), colaborador: employee.nome, funcao: employee.funcao, setor: employee.setor, epi: epi.nome, ca: epi.ca, quantidade: q, motivo: delivery.motivo, assinatura: signature };
    setDeliveries([record, ...deliveries]);
    setStock(stock.map(item => item.id === epi.id ? { ...item, quantidade: item.quantidade - q } : item));
    setDelivery({ employeeId: '', epiId: '', quantidade: '1', motivo: 'Entrega de EPI' }); setSignature(''); setMessage('Entrega registrada e estoque baixado.');
  };
  const exportCSV = () => {
    const header = 'ID;Data;Colaborador;Função;Setor;EPI;CA;Quantidade;Motivo\n';
    const rows = deliveries.map(d => `${d.id};${d.data};${d.colaborador};${d.funcao};${d.setor};${d.epi};${d.ca};${d.quantidade};${d.motivo}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'controle_entrega_epi.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <main>
    <header><div><h1>Sistema de Controle de Entrega de EPI</h1><p>Cadastro, estoque, entrega, baixa automática e assinatura eletrônica.</p></div><ShieldCheck size={54}/></header>
    {message && <section className="notice">{message}</section>}
    <section className="cards"><div><span>Colaboradores</span><b>{employees.length}</b></div><div><span>Itens em estoque</span><b>{stock.length}</b></div><div><span>Entregas registradas</span><b>{deliveries.length}</b></div><div><span>Estoque baixo</span><b>{lowStock.length}</b></div></section>
    <nav>{['entrega','estoque','colaboradores','historico'].map(t => <button key={t} className={tab===t?'active':''} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === 'entrega' && <section className="panel"><h2>Registrar entrega de EPI</h2><div className="grid4"><select value={delivery.employeeId} onChange={e=>setDelivery({...delivery,employeeId:e.target.value})}><option value="">Colaborador</option>{employees.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select><select value={delivery.epiId} onChange={e=>setDelivery({...delivery,epiId:e.target.value})}><option value="">EPI</option>{stock.map(e=><option key={e.id} value={e.id}>{e.nome} - saldo {e.quantidade}</option>)}</select><input type="number" min="1" value={delivery.quantidade} onChange={e=>setDelivery({...delivery,quantidade:e.target.value})}/><input value={delivery.motivo} onChange={e=>setDelivery({...delivery,motivo:e.target.value})}/></div>{employee&&epi&&<div className="info"><b>Colaborador:</b> {employee.nome} | <b>EPI:</b> {epi.nome} | <b>CA:</b> {epi.ca} | <b>Saldo:</b> {epi.quantidade}</div>}<h3>Assinatura eletrônica do colaborador</h3><SignaturePad onSave={setSignature} signature={signature}/><button onClick={register}><ClipboardCheck size={16}/> Confirmar entrega e baixar estoque</button></section>}

    {tab === 'estoque' && <section className="panel"><h2>Cadastrar EPI no estoque</h2><div className="grid5"><input placeholder="Nome do EPI" value={epiForm.nome} onChange={e=>setEpiForm({...epiForm,nome:e.target.value})}/><input placeholder="Nº do CA" value={epiForm.ca} onChange={e=>setEpiForm({...epiForm,ca:e.target.value})}/><input placeholder="Unidade" value={epiForm.unidade} onChange={e=>setEpiForm({...epiForm,unidade:e.target.value})}/><input type="number" placeholder="Quantidade" value={epiForm.quantidade} onChange={e=>setEpiForm({...epiForm,quantidade:e.target.value})}/><input type="number" placeholder="Estoque mínimo" value={epiForm.minimo} onChange={e=>setEpiForm({...epiForm,minimo:e.target.value})}/></div><button onClick={addEpi}><PackagePlus size={16}/> Adicionar ao estoque</button><table><thead><tr><th>EPI</th><th>CA</th><th>Unidade</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{stock.map(i=><tr key={i.id}><td>{i.nome}</td><td>{i.ca}</td><td>{i.unidade}</td><td>{i.quantidade}</td><td><span className={`badge ${i.quantidade<=i.minimo?'bad':'ok'}`}>{i.quantidade<=i.minimo?'Baixo':'OK'}</span></td></tr>)}</tbody></table></section>}

    {tab === 'colaboradores' && <section className="panel"><h2>Cadastrar colaborador</h2><div className="grid3"><input placeholder="Nome completo" value={empForm.nome} onChange={e=>setEmpForm({...empForm,nome:e.target.value})}/><input placeholder="Função" value={empForm.funcao} onChange={e=>setEmpForm({...empForm,funcao:e.target.value})}/><input placeholder="Setor" value={empForm.setor} onChange={e=>setEmpForm({...empForm,setor:e.target.value})}/></div><button onClick={addEmployee}><UserPlus size={16}/> Cadastrar colaborador</button><div className="list">{employees.map(e=><div key={e.id} className="item"><b>{e.nome}</b><span>{e.funcao} • {e.setor}</span></div>)}</div></section>}

    {tab === 'historico' && <section className="panel"><div className="row between"><h2>Histórico de entregas</h2><button className="secondary" onClick={exportCSV}><FileDown size={16}/> Exportar CSV</button></div>{deliveries.length===0?<p>Nenhuma entrega registrada.</p>:deliveries.map(d=><div className="delivery" key={d.id}><div><b>{d.colaborador}</b><span>{d.data} • {d.funcao} • {d.setor}</span><p><b>EPI:</b> {d.epi} | <b>CA:</b> {d.ca} | <b>Qtd:</b> {d.quantidade}</p></div>{d.assinatura&&<img src={d.assinatura} alt="Assinatura"/>}</div>)}</section>}
    <footer><b>Observação:</b> biometria real por impressão digital exige leitor biométrico e integração específica. Este sistema usa assinatura eletrônica desenhada na tela.</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
