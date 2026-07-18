import { DatabaseSync } from 'node:sqlite'
import { createReadStream, existsSync, mkdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { createServer } from 'node:http'

const root = resolve(import.meta.dirname, '..')
const dataDir = join(root, 'data')
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'xequemate.db'))

db.exec(`
  create table if not exists tournaments (id integer primary key, code text unique not null, name text not null, city text, event_date text, rounds integer, system text, status text default 'active');
  create table if not exists players (id integer primary key, tournament_id integer not null, name text not null, rating integer, club text, category text, points real default 0, wins integer default 0, draws integer default 0, losses integer default 0);
  create table if not exists matches (id integer primary key, tournament_id integer not null, round_number integer not null, board integer not null, white_player_id integer not null, black_player_id integer not null, result text);
`)
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
const tournament = code => {
  const event = db.prepare('select * from tournaments where code=?').get(code)
  if (!event) return null
  const players = db.prepare('select * from players where tournament_id=? order by points desc,wins desc,rating desc').all(event.id)
  const matches = db.prepare(`select m.id,m.board,m.round_number,m.result,w.name white,b.name black from matches m join players w on w.id=m.white_player_id join players b on b.id=m.black_player_id where m.tournament_id=? order by m.board`).all(event.id)
  return { ...event, players, matches }
}
const recalculate = tournamentId => {
  db.prepare('update players set points=0,wins=0,draws=0,losses=0 where tournament_id=?').run(tournamentId)
  const games = db.prepare('select * from matches where tournament_id=? and result is not null').all(tournamentId)
  const score = db.prepare('update players set points=points+?, wins=wins+?, draws=draws+?, losses=losses+? where id=?')
  for (const game of games) {
    if (game.result === '½–½') { score.run(.5,0,1,0,game.white_player_id); score.run(.5,0,1,0,game.black_player_id) }
    else if (game.result === '1–0' || game.result === 'WO') { score.run(1,1,0,0,game.white_player_id); score.run(0,0,0,1,game.black_player_id) }
    else { score.run(0,0,0,1,game.white_player_id); score.run(1,1,0,0,game.black_player_id) }
  }
}
const createMatches = (tournamentId, system, requestedRounds) => {
  const players = db.prepare('select id from players where tournament_id=? order by rating desc, name').all(tournamentId)
  if (players.length < 2 || players.length % 2) return
  const add = db.prepare('insert into matches (tournament_id,round_number,board,white_player_id,black_player_id) values (?,?,?,?,?)')
  if (system === 'swiss') {
    for (let index = 0; index < players.length; index += 2) {
      const white = (index / 2) % 2 === 0 ? players[index] : players[index + 1]
      const black = (index / 2) % 2 === 0 ? players[index + 1] : players[index]
      add.run(tournamentId, 1, index / 2 + 1, white.id, black.id)
    }
    return
  }
  // Berger/circle system: every player meets every other player exactly once.
  const ring = [...players]
  const maxRounds = Math.min(Number(requestedRounds), ring.length - 1)
  for (let round = 1; round <= maxRounds; round++) {
    for (let board = 0; board < ring.length / 2; board++) {
      const first = ring[board], second = ring[ring.length - 1 - board]
      const white = (round + board) % 2 ? first : second
      const black = (round + board) % 2 ? second : first
      add.run(tournamentId, round, board + 1, white.id, black.id)
    }
    ring.splice(1, 0, ring.pop())
  }
}
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' }
createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost:3001')
  if (url.pathname === '/api/tournaments' && req.method === 'GET') return json(res,200,db.prepare('select * from tournaments order by id desc').all())
  if (url.pathname === '/api/tournaments' && req.method === 'POST') {
    let raw=''; for await (const part of req) raw += part
    const body = JSON.parse(raw || '{}')
    if (!body.name || !Array.isArray(body.players) || body.players.length < 2) return json(res,422,{error:'Nome e ao menos dois participantes são obrigatórios'})
    if (body.players.length % 2) return json(res,422,{error:'Nesta versão local, informe uma quantidade par de participantes.'})
    let code; do code = `XAD${Math.floor(100 + Math.random()*900)}`; while (db.prepare('select 1 from tournaments where code=?').get(code))
    const system = 'swiss', rounds = 5, today = new Date().toISOString().slice(0,10)
    db.prepare('insert into tournaments (code,name,city,event_date,rounds,system,status) values (?,?,?,?,?,?,?)').run(code,body.name,null,today,rounds,system,'active')
    const tournamentId = db.prepare('select id from tournaments where code=?').get(code).id
    const addPlayer = db.prepare('insert into players (tournament_id,name,rating,club,category) values (?,?,?,?,?)')
    for (const player of body.players) addPlayer.run(tournamentId, player.name, player.rating || null, player.club || null, player.category || null)
    createMatches(tournamentId, system, rounds)
    return json(res,201,tournament(code))
  }
  if (url.pathname.startsWith('/api/tournaments/')) {
    const data = tournament(decodeURIComponent(url.pathname.split('/').pop()))
    return data ? json(res,200,data) : json(res,404,{error:'Torneio não encontrado'})
  }
  if (url.pathname.startsWith('/api/matches/') && req.method === 'PUT') {
    let raw=''; for await (const part of req) raw += part
    const { result } = JSON.parse(raw || '{}')
    if (!['1–0','½–½','0–1','WO'].includes(result)) return json(res,422,{error:'Resultado inválido'})
    const id = Number(url.pathname.split('/').pop()), game = db.prepare('select tournament_id from matches where id=?').get(id)
    if (!game) return json(res,404,{error:'Partida não encontrada'})
    db.prepare('update matches set result=? where id=?').run(result, id)
    recalculate(game.tournament_id)
    return json(res,200,{ok:true,tournament:tournament(db.prepare('select code from tournaments where id=?').get(game.tournament_id).code)})
  }
  if (url.pathname === '/api/players' && req.method === 'POST') {
    let raw=''; for await (const part of req) raw += part
    const body = JSON.parse(raw || '{}')
    if (!body.tournament_id || !body.name) return json(res,422,{error:'Torneio e nome são obrigatórios'})
    db.prepare('insert into players (tournament_id,name,rating,club,category) values (?,?,?,?,?)').run(Number(body.tournament_id),body.name,body.rating ? Number(body.rating) : null,body.club || null,body.category || null)
    const code = db.prepare('select code from tournaments where id=?').get(Number(body.tournament_id))?.code
    return json(res,201,tournament(code))
  }
  if (url.pathname.startsWith('/api/players/') && req.method === 'DELETE') {
    const id = Number(url.pathname.split('/').pop()), player = db.prepare('select tournament_id from players where id=?').get(id)
    if (!player) return json(res,404,{error:'Jogador não encontrado'})
    db.prepare('delete from players where id=?').run(id)
    const code = db.prepare('select code from tournaments where id=?').get(player.tournament_id)?.code
    return json(res,200,tournament(code))
  }
  // `npm start` also serves the compiled React application, making shared links work locally.
  const requested = url.pathname === '/' ? '/index.html' : url.pathname
  const file = join(root, 'dist', requested)
  if (existsSync(file) && file.startsWith(join(root,'dist'))) { res.writeHead(200,{ 'content-type':mime[extname(file)] || 'application/octet-stream' }); return createReadStream(file).pipe(res) }
  if (existsSync(join(root,'dist','index.html'))) { res.writeHead(200,{ 'content-type':'text/html' }); return createReadStream(join(root,'dist','index.html')).pipe(res) }
  json(res,404,{error:'Execute npm run build antes de npm start.'})
}).listen(process.env.PORT ? Number(process.env.PORT) : 3001, '0.0.0.0', () => console.log(`XequeMate rodando na porta ${process.env.PORT ? Number(process.env.PORT) : 3001}`))
