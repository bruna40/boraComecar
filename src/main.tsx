import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QRCodeSVG } from 'qrcode.react'
import { Activity, Bell, ChevronDown, CircleHelp, Copy, ExternalLink, Gavel, LayoutDashboard, Menu, MoreHorizontal, Plus, QrCode, Search, Share2, Swords, Trophy, Users, X, CheckCircle2 } from 'lucide-react'
import './styles.css'

type Player = { id: number; name: string; rating: number | null; club: string | null; points: number; wins: number; draws: number; losses: number; trend?: string[] }
type Match = { id: number; white: string; black: string; result?: string; board: number }
type Tournament = { id: number; code: string; name: string; city: string | null; event_date: string; rounds: number; system: string; status: string; players: Player[]; matches: Match[] }

const demoPlayers = [
  { id: -1, name: 'Ana Beatriz Silva', rating: 1820, club: 'Clube de Xadrez Fortaleza', category: 'Adulto' },
  { id: -2, name: 'Gabriel Oliveira', rating: 1745, club: 'Academia Xeque-Mate', category: 'Sub-18' },
  { id: -3, name: 'Mariana Costa', rating: 1680, club: 'CX Sobral', category: 'Feminino' },
  { id: -4, name: 'Pedro Henrique Lima', rating: 1610, club: 'Clube de Xadrez Fortaleza', category: 'Sub-16' },
  { id: -5, name: 'Lucas Almeida', rating: 1535, club: 'Independente', category: 'Adulto' },
]

function App() {
  const params = new URLSearchParams(window.location.search)
  const initialCode = params.get('codigo')
  const [aba, setAba] = useState(params.get('aba') || 'visao-geral')
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<'new' | 'share' | 'result' | 'player' | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [publicCode] = useState(initialCode?.toUpperCase() || '')

  const publicUrl = `${window.location.origin}/?codigo=${encodeURIComponent(publicCode)}`
  const judgeUrl = `${publicUrl}&aba=juiz`
  const dashboardUrl = `${publicUrl}&aba=dashboard`

  const sorted = useMemo(() => (tournament?.players ?? []).filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [query, tournament])

  const loadTournament = async () => {
    if (!publicCode) return
    try {
      const response = await fetch(`/api/tournaments/${publicCode}`)
      if (response.ok) setTournament(await response.json())
      else setAnnouncement('Não foi possível carregar o torneio.')
    } catch { setAnnouncement('Sem conexão. Não foi possível atualizar o torneio.') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (!publicCode) { setLoading(false); return }; loadTournament(); const timer = window.setInterval(loadTournament, 5000); return () => window.clearInterval(timer) }, [publicCode])

  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search)
      setAba(p.get('aba') || 'visao-geral')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const pageName = aba === 'juiz' ? 'Bancada do juiz' : aba === 'dashboard' ? 'Dashboard ao vivo' : aba === 'jogadores' ? 'Jogadores' : 'Visão geral'
    document.title = tournament ? `${tournament.name} · ${pageName} | XequeMate` : 'XequeMate — Gestão de torneios de xadrez'
  }, [aba, tournament])

  const navigate = (novaAba: string) => {
    const p = new URLSearchParams(window.location.search)
    if (novaAba === 'visao-geral') p.delete('aba')
    else p.set('aba', novaAba)
    const newUrl = `/?${p.toString()}`
    window.history.pushState(null, '', newUrl)
    setAba(novaAba)
    setMenu(false)
  }

  const saveResult = async (result: string) => {
    if (!selectedMatch) return
    setModal(null)
    const response = await fetch(`/api/matches/${selectedMatch.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ result }) })
    if (response.ok) { setTournament((await response.json()).tournament); setAnnouncement('Resultado salvo com sucesso.') }
    else setAnnouncement('Não foi possível salvar o resultado. Tente novamente.')
  }

  if (!publicCode) return <Landing onCreate={() => setModal('new')} modal={modal} close={() => setModal(null)} onCreated={(item) => window.location.href = `/?codigo=${item.code}&aba=juiz`} />

  return <div className={`app-shell view-${aba}`}>
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <aside id="main-navigation" className={menu ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><a className="brand-home" href="/"><div className="brand-mark"><Swords size={22} /></div><span>Xeque<span className="accent">Mate</span></span></a><button className="mobile-close" aria-label="Fechar menu" onClick={()=>setMenu(false)}><X /></button></div>
      <nav>
        <button aria-current={aba === 'visao-geral' ? 'page' : undefined} className={`nav-item ${aba === 'visao-geral' ? 'active' : ''}`} onClick={() => navigate('visao-geral')}><LayoutDashboard size={19} />Visão geral</button>
        <button aria-current={aba === 'jogadores' ? 'page' : undefined} className={`nav-item ${aba === 'jogadores' ? 'active' : ''}`} onClick={() => navigate('jogadores')}><Users size={19} />Jogadores</button>
        <button aria-current={aba === 'juiz' ? 'page' : undefined} className={`nav-item ${aba === 'juiz' ? 'active' : ''}`} onClick={() => navigate('juiz')}><Gavel size={19} />Bancada do Juiz</button>
        <button aria-current={aba === 'dashboard' ? 'page' : undefined} className={`nav-item ${aba === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}><Activity size={19} />Dashboard</button>
      </nav>
      <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={19} />Central de ajuda</button><div className="profile"><div className="avatar">BS</div><div><b>Bruna Santiago</b><small>Árbitra</small></div><MoreHorizontal size={18} /></div></div>
    </aside>
    <main>
      <header><button className="hamburger" aria-label="Abrir menu" aria-expanded={menu} aria-controls="main-navigation" onClick={() => setMenu(true)}><Menu /></button><div className={`crumb crumb-${aba}`}><span>Torneios</span><b>/</b><strong>{tournament?.name || 'Carregando'}</strong><ChevronDown size={15} /></div><div className="top-actions"><a className="public-link" href={dashboardUrl} target="_blank" rel="noreferrer" aria-label="Abrir dashboard ao vivo em nova aba"><ExternalLink size={16} /><span>Dashboard ao vivo</span></a></div></header>
      {loading ? <div className="page" role="status"><p>Carregando torneio…</p></div> : !tournament ? <div className="page"><p role="alert">Torneio não encontrado ou indisponível.</p></div> :
        aba === 'jogadores' ? <PlayersView tournament={tournament} query={query} setQuery={setQuery} sorted={sorted} setModal={setModal} /> :
          aba === 'juiz' ? <JudgeBenchView tournament={tournament} setModal={setModal} setSelectedMatch={setSelectedMatch} dashboardUrl={dashboardUrl} /> :
            aba === 'dashboard' ? <MatchDashboardView tournament={tournament} publicCode={publicCode} /> :
              <OverviewView tournament={tournament} sorted={sorted} setModal={setModal} setSelectedMatch={setSelectedMatch} publicCode={publicCode} />
      }
    </main>
    <button className="floating-add" onClick={() => setModal('new')}><Plus size={20} /> Novo torneio</button>
    {modal === 'new' && <NewTournament onClose={() => setModal(null)} onCreated={(item) => window.location.href = `/?codigo=${item.code}&aba=juiz`} />}
    {modal === 'share' && <ShareModal onClose={() => setModal(null)} judgeUrl={judgeUrl} dashboardUrl={dashboardUrl} code={publicCode} />}
    {modal === 'player' && tournament && <PlayerModal tournamentId={tournament.id} onClose={() => setModal(null)} onCreated={setTournament} />}
    {modal === 'result' && selectedMatch && <ResultModal match={selectedMatch} onClose={() => setModal(null)} onSave={saveResult} />}
    <nav className="mobile-quick-nav" aria-label="Navegação rápida">
      <button aria-current={aba === 'juiz' ? 'page' : undefined} className={aba === 'juiz' ? 'active' : ''} onClick={() => navigate('juiz')}><Gavel size={18} />Lançar</button>
      <button aria-current={aba === 'dashboard' ? 'page' : undefined} className={aba === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}><LayoutDashboard size={18} />Dashboard</button>
    </nav>
  </div>

  function OverviewView({ tournament, sorted, setModal, setSelectedMatch, publicCode }: any) { if (!tournament) return null; return <div className="page judge-page"><section className="hero"><div><div className="eyebrow"><span />{tournament.status === 'finished' ? 'FINALIZADO' : 'EM ANDAMENTO'}</div><h1>{tournament.name}</h1><p>{tournament.city || 'Sem cidade'} · {new Date(`${tournament.event_date}T12:00`).toLocaleDateString('pt-BR')}</p></div><div className="hero-actions"><button className="secondary" onClick={() => setModal('player')}><Users size={17} />Jogador</button><button className="secondary" onClick={() => setModal('share')}><Share2 size={17} />Compartilhar</button><button className="primary" onClick={() => setModal('new')}><Plus size={18} />Novo torneio</button></div></section><section className="stats"><Stat icon={<Users />} label="Jogadores" value={String(tournament.players.length)} hint="cadastrados" /><Stat icon={<Swords />} label="Rodada atual" value={`3 de ${tournament.rounds}`} hint={`${tournament.matches.length} partidas`} /><Stat icon={<Trophy />} label="Sistema" value={tournament.system === 'swiss' ? 'Suíço' : 'Todos contra todos'} hint={`${tournament.rounds} rodadas`} /><Stat icon={<Bell />} label="Concluídas" value={String(tournament.matches.filter((m: any) => m.result).length)} hint={`de ${tournament.matches.length} partidas`} /></section><section className="grid"><div className="card standings"><div className="card-head"><div><h2>Classificação</h2><p>Calculada pelo banco local</p></div><button className="text-btn" onClick={() => setModal('player')}>+ jogador</button></div><div className="table-wrap"><table><thead><tr><th>#</th><th>JOGADOR</th><th>PTS</th><th>V</th><th>E</th><th>D</th><th>RATING</th><th /></tr></thead><tbody>{sorted.map((p: any, i: number) => <tr key={p.id}><td><span className={i < 3 ? 'rank rank-' + i : 'rank'}>{i + 1}</span></td><td><div className="player"><div className="mini-avatar">{p.name.split(' ').map((x: any) => x[0]).join('').slice(0, 2)}</div><div><b>{p.name}</b><small>{p.club || 'Sem clube'}</small></div></div></td><td className="points">{p.points.toFixed(1)}</td><td>{p.wins}</td><td>{p.draws}</td><td>{p.losses}</td><td>{p.rating || '—'}</td><td><button className="dots"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div></div><div className="side-column"><div className="card rounds"><div className="card-head"><div><h2>Rodada 3</h2><p>{tournament.matches.length} partidas</p></div></div>{tournament.matches.map((m: any) => <button className="match" key={m.id} onClick={() => { setSelectedMatch(m); setModal('result') }}><span className="board">{m.id}</span><div><b>{m.white}</b><b>{m.black}</b></div><span className={m.result ? 'match-result done' : 'match-result'}>{m.result || '–'}</span></button>)}</div><div className="public-card"><div><span>ACOMPANHAMENTO AO VIVO</span><h3>Compartilhe seu torneio</h3><p>Espectadores acompanham cada alteração.</p><button onClick={() => setModal('share')}>Gerar link <ExternalLink size={14} /></button></div><div className="qr"><QrCode size={29} /></div></div></div></section></div> }

  function PlayersView({ tournament, setModal }: any) {
    if (!tournament) return null
    const players = tournament.players.length ? tournament.players : demoPlayers
    return <div className="page">
      <div className="card standings players-table">
        <div className="card-head">
          <div><h2>Jogadores Inscritos</h2><p>{players.length} participantes {tournament.players.length ? 'confirmados' : 'de demonstração'}</p></div>
          <button className="primary" onClick={() => setModal('player')}><Plus size={16} /> Novo Jogador</button>
        </div>
        {!tournament.players.length && <div className="demo-notice">Exibindo dados demonstrativos. Adicione jogadores para iniciar sua lista.</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>NOME</th><th>CLUBE/CIDADE</th><th>RATING</th><th>CATEGORIA</th></tr></thead>
            <tbody>
              {players.map((p: any, i: number) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td><div className="player"><div className="mini-avatar">{p.name.split(' ').map((x: any) => x[0]).join('').slice(0, 2)}</div><div><b>{p.name}</b></div></div></td>
                  <td>{p.club || '—'}</td>
                  <td>{p.rating || '—'}</td>
                  <td>{p.category || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  }

  function JudgeBenchView({ tournament, setModal, setSelectedMatch, dashboardUrl }: any) {
    if (!tournament) return null
    return <div className="page judge-bench">
      <div className="hero">
        <div>
          <div className="eyebrow"><Gavel size={14} /> BANCADA DO JUIZ</div>
          <h1>Rodada em Andamento</h1>
          <p>Toque em uma mesa para lançar o resultado. Ideal para usar pelo celular.</p>
        </div>
        <a className="secondary judge-dashboard-link" href={dashboardUrl} target="_blank" rel="noreferrer"><LayoutDashboard size={17} /> Abrir dashboard</a>
      </div>
      <div className="bench-grid">
        {tournament.matches.map((m: any) => (
          <button className="match-card" aria-label={`Mesa ${m.board}: ${m.white}, brancas, contra ${m.black}, pretas. ${m.result ? `Resultado ${m.result}` : 'Aguardando resultado'}`} key={m.id} onClick={() => { setSelectedMatch(m); setModal('result') }}>
            <div className="match-card-head"><span>Mesa {m.board}</span><small>{m.result ? 'Resultado lançado' : 'Toque para lançar'}</small></div>
            <div className="match-card-body">
              <div className="match-player white-player"><span>BRANCAS</span><b>{m.white}</b></div>
              <div className="match-vs">VS</div>
              <div className="match-player black-player"><span>PRETAS</span><b>{m.black}</b></div>
            </div>
            <div className={`match-card-foot ${m.result ? 'done' : ''}`}>
              {m.result ? <><CheckCircle2 size={14} /> {m.result}</> : 'Aguardando resultado'}
            </div>
          </button>
        ))}
      </div>
    </div>
  }

  function MatchDashboardView({ tournament, publicCode }: any) {
    if (!tournament) return null
    return <div className="page dashboard-page">
      <section className="public-hero">
        <div className="live-pill"><span /> AO VIVO</div>
        <h1>Andamento das Mesas</h1>
        <p>Acompanhe os confrontos em tempo real.</p>
      </section>
      <section className="dashboard-grid">
        {tournament.matches.map((m: any) => (
          <div className={`dash-card ${m.result ? 'finished' : 'playing'}`} key={m.id}>
            <div className="dash-card-header">
              <span className="dash-board">Mesa {m.board}</span>
              <span className="dash-status">{m.result ? 'Concluído' : 'Em andamento'}</span>
            </div>
            <div className="dash-card-players">
              <div className={`dash-player ${m.result === '1–0' || m.result === 'WO' ? 'winner' : ''}`}>
                <div className="dash-avatar">Brancas</div>
                <span className="dash-name">{m.white}</span>
              </div>
              <div className="dash-vs">VS</div>
              <div className={`dash-player ${m.result === '0–1' ? 'winner' : ''}`}>
                <div className="dash-avatar dark">Pretas</div>
                <span className="dash-name">{m.black}</span>
              </div>
            </div>
            <div className="dash-card-result">
              {m.result ? <strong>Placar: {m.result}</strong> : <span className="pulsing-text">Jogando...</span>}
            </div>
          </div>
        ))}
      </section>
    </div>
  }
}

function Landing({onCreate,modal,close,onCreated}:{onCreate:()=>void;modal:'new'|'share'|'result'|'player'|null;close:()=>void;onCreated:(item:Tournament)=>void}) {
  const [code,setCode]=useState('');
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRecentes(data) })
      .catch(() => {});
  }, []);

  return <div className="landing-wrapper">
    <div className="landing-bg-art"></div>
    <div className="landing-glow"></div>

    <div className="chess-float" aria-hidden="true"><span>♚</span><span>♛</span><span>♞</span><span>♜</span><span>♝</span><span>♟</span></div>

    <header className="landing-header">
      <div className="landing-brand-row">
        <div className="brand-mark"><Swords size={22}/></div>
        <span className="landing-logo">Xeque<span className="accent">Mate</span></span>
      </div>
      <div className="header-badge"><span className="pulse-ring"></span>Sistema Local Ativo</div>
    </header>

    <main className="landing-main-content">
      <section className="landing-hero">
        <div className="hero-chip">♟ GESTÃO DE TORNEIOS DE XADREZ</div>
        <h1 className="hero-title">Gerencie seus torneios<br/>de <span className="hero-lime">xadrez</span></h1>
        <p className="hero-subtitle">Crie o torneio, informe os participantes e acompanhe as rodadas em tempo real. Tudo offline, direto no seu computador.</p>
      </section>

      <section className="landing-grid">
        <div className="action-card ac-create">
          <div className="ac-icon"><Plus size={24}/></div>
          <h2>Novo Torneio</h2>
          <p>Configure regras, adicione os jogadores iniciais e dê a largada imediatamente.</p>
          <button className="btn-lime" onClick={onCreate}><Plus size={16}/> Criar meu torneio</button>
        </div>

        <div className="action-card">
          <div className="ac-icon"><Search size={24}/></div>
          <h2>Acessar Torneio</h2>
          <p>Já possui um código de torneio? Entre para acompanhar o andamento.</p>
          <form className="ac-form" onSubmit={e=>{e.preventDefault(); if(code.trim()) window.location.href=`/?codigo=${encodeURIComponent(code.trim().toUpperCase())}`}}>
            <label className="sr-only" htmlFor="tournament-code">Código do torneio</label><input id="tournament-code" className="lime-input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Ex.: XAD842" required />
            <button className="btn-outline">Acessar</button>
          </form>
        </div>
      </section>

      {recentes.length > 0 && (
        <section className="landing-table-section">
          <h3 className="section-title"><Trophy size={16}/> Torneios no sistema</h3>
          <div className="table-container">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Torneio</th>
                  <th>Formato</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentes.map(t => (
                  <tr key={t.id}>
                    <td><div className="status-cell"><span className={`status-dot ${t.status !== 'finished' ? 'active' : ''}`}></span> {t.status === 'finished' ? 'Finalizado' : 'Ativo'}</div></td>
                    <td><div className="tournament-cell"><b>{t.name}</b><span>{t.city || 'Sem local'}</span></div></td>
                    <td>{t.system === 'swiss' ? `Suíço (${t.rounds} Rodadas)` : 'Todos contra todos'}</td>
                    <td>{t.event_date ? new Date(`${t.event_date}T12:00`).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="action-col"><a className="btn-icon" href={`/?codigo=${t.code}&aba=visao-geral`} aria-label={`Abrir torneio ${t.name}`}><ChevronDown aria-hidden="true" style={{transform: 'rotate(-90deg)'}} size={18}/></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>




    {modal==='new' && <NewTournament onClose={close} onCreated={onCreated}/>}
  </div>
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode, label: string, value: string, hint: string }) { return <div className="stat"><div className="stat-icon" aria-hidden="true">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div> }

function useModalAccessibility<T extends HTMLElement>(onClose: () => void) {
  const modalRef = useRef<T>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const modal = modalRef.current
    if (!modal) return
    const getFocusable = () => Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')).filter(element => !element.hasAttribute('hidden'))
    getFocusable()[0]?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); previousFocus?.focus() }
  }, [onClose])
  return modalRef
}
function NewTournament({ onClose, onCreated }: { onClose: () => void; onCreated: (item: Tournament) => void }) {
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const modalRef = useModalAccessibility<HTMLFormElement>(onClose)
  const create = async (form: HTMLFormElement) => {
    setSaving(true); setError('')
    const fields = new FormData(form)
    const players = String(fields.get('participants') || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [name, rating, club, category] = line.split(';').map(item => item.trim())
      return { name, rating: rating ? Number(rating) : null, club, category }
    }).filter(player => player.name)
    try {
      const response = await fetch('/api/tournaments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: fields.get('name'), players }) })
      if (response.ok) onCreated(await response.json()); else { const body = await response.json(); setError(body.error || 'Não foi possível criar o torneio.'); setSaving(false) }
    } catch { setError('Sem conexão. Tente novamente.'); setSaving(false) }
  }
  return <div className="overlay"><form ref={modalRef} className="modal tournament-modal" role="dialog" aria-modal="true" aria-labelledby="new-tournament-title" onSubmit={e => { e.preventDefault(); create(e.currentTarget) }}><button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}><X /></button><div className="modal-icon" aria-hidden="true"><Trophy /></div><h2 id="new-tournament-title">Novo campeonato</h2><p>Informe o nome e os participantes. A primeira rodada será gerada automaticamente.</p><label>Nome do campeonato<input name="name" placeholder="Ex.: Campeonato Municipal" required /></label><label>Participantes<textarea name="participants" rows={9} required placeholder={'Ana Silva\nBruno Costa\nCarlos Lima\nDaniel Souza'} /></label><small className="form-hint">Um nome por linha. Mínimo de 2 participantes e quantidade par.</small>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary wide" disabled={saving}>{saving ? 'Criando…' : 'Criar campeonato'}</button></form></div>
}
function PlayerModal({ tournamentId, onClose, onCreated }: { tournamentId: number; onClose: () => void; onCreated: (item: Tournament) => void }) { const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const modalRef = useModalAccessibility<HTMLFormElement>(onClose); const create = async (form: HTMLFormElement) => { setSaving(true); setError(''); const fields = new FormData(form); try { const response = await fetch('/api/players', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tournament_id: tournamentId, name: fields.get('name'), rating: fields.get('rating'), club: fields.get('club'), category: fields.get('category') }) }); if (response.ok) { onCreated(await response.json()); onClose() } else { setError('Não foi possível adicionar o jogador.'); setSaving(false) } } catch { setError('Sem conexão. Tente novamente.'); setSaving(false) } }; return <div className="overlay"><form ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="new-player-title" onSubmit={e => { e.preventDefault(); create(e.currentTarget) }}><button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}><X /></button><div className="modal-icon" aria-hidden="true"><Users /></div><h2 id="new-player-title">Adicionar jogador</h2><p>O jogador será salvo no torneio atual.</p><label>Nome completo<input name="name" required placeholder="Nome do jogador" /></label><div className="fields"><label>Rating FIDE<input name="rating" type="number" min="0" placeholder="Opcional" /></label><label>Clube ou cidade<input name="club" placeholder="Opcional" /></label></div><label>Categoria<input name="category" placeholder="Ex.: Sub-18" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary wide" disabled={saving}>{saving ? 'Salvando…' : 'Adicionar jogador'}</button></form></div> }
function ShareModal({ onClose, judgeUrl, dashboardUrl, code }: { onClose: () => void; judgeUrl: string; dashboardUrl: string; code: string }) { const modalRef = useModalAccessibility<HTMLDivElement>(onClose); const [announcement, setAnnouncement] = useState(''); const copy = async (value: string, label: string) => { await navigator.clipboard?.writeText(value); setAnnouncement(`${label} copiado.`) }; return <div className="overlay"><div ref={modalRef} className="modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="modal-close" aria-label="Fechar" onClick={onClose}><X /></button><div className="modal-icon" aria-hidden="true"><Share2 /></div><h2 id="share-title">Links do campeonato</h2><p>Envie o dashboard ao público e mantenha o link do juiz em privado.</p><p className="sr-only" role="status">{announcement}</p><div className="share-code">{code}</div><p className="share-label">LINK DO DASHBOARD — ACOMPANHAR AO VIVO</p><div className="share-link"><span>{dashboardUrl}</span><button aria-label="Copiar link do dashboard" onClick={() => copy(dashboardUrl, 'Link do dashboard')}><Copy size={16} /></button></div><p className="share-label">LINK DO JUIZ — LANÇAR PONTUAÇÃO</p><div className="share-link"><span>{judgeUrl}</span><button aria-label="Copiar link do juiz" onClick={() => copy(judgeUrl, 'Link do juiz')}><Copy size={16} /></button></div><div className="qr-large" aria-label="QR Code para o dashboard"><QRCodeSVG value={dashboardUrl} size={140} /></div><button className="primary wide" onClick={onClose}>Concluído</button></div></div> }
function ResultModal({ match, onClose, onSave }: { match: Match; onClose: () => void; onSave: (x: string) => void }) { const [result, setResult] = useState(match.result || ''); const modalRef = useModalAccessibility<HTMLDivElement>(onClose); return <div className="overlay"><div ref={modalRef} className="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title"><button className="modal-close" aria-label="Fechar" onClick={onClose}><X /></button><h2 id="result-title">Registrar resultado</h2><p>Tabuleiro {match.board} · Rodada atual</p><div className="versus"><b>{match.white}</b><span aria-hidden="true">×</span><b>{match.black}</b></div><div className="result-options" role="group" aria-label="Escolha o resultado">{[['1–0', 'Vitória das brancas'], ['½–½', 'Empate'], ['0–1', 'Vitória das pretas'], ['WO', 'Walkover']].map(([v, l]) => <button type="button" aria-pressed={result === v} className={result === v ? 'chosen' : ''} onClick={() => setResult(v)} key={v}><b>{v}</b><small>{l}</small></button>)}</div><button className="primary wide" disabled={!result} onClick={() => onSave(result)}>Salvar resultado</button></div></div> }

createRoot(document.getElementById('root')!).render(<App />)
