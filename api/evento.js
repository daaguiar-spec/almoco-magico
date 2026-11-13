// GET  /api/evento  -> dados da edição atual
// POST /api/evento  -> salva (exige header x-admin-password = ADMIN_PASSWORD)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'almoco-magico:evento';
const DEF = { ed: '1ª Edição', data: '2026-11-26', hora: '11:00', local: 'Forneria Coriolano', end: 'R. Osvaldo Cruz, 2786 - Dionísio Torres, Fortaleza - CE' };

async function kv(path, body) {
  const r = await fetch(`${URL_}/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body });
  if (!r.ok) throw new Error('kv ' + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Banco de dados não configurado na Vercel.' });
  try {
    if (req.method === 'GET') {
      const { result } = await kv(`get/${KEY}`);
      return res.status(200).json(result ? JSON.parse(result) : DEF);
    }
    if (req.method === 'POST') {
      const pass = process.env.ADMIN_PASSWORD;
      if (!pass || req.headers['x-admin-password'] !== pass) return res.status(401).json({ error: 'Senha incorreta.' });
      let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}');
      const s = v => String(v || '').trim().slice(0, 200);
      const ev = { ed: s(b.ed), data: s(b.data), hora: s(b.hora), local: s(b.local), end: s(b.end) };
      if (!ev.ed || !/^\d{4}-\d{2}-\d{2}$/.test(ev.data) || !/^\d{2}:\d{2}$/.test(ev.hora) || !ev.local || !ev.end)
        return res.status(400).json({ error: 'Preencha todos os campos corretamente.' });
      await kv(`set/${KEY}`, JSON.stringify(ev));
      return res.status(200).json(ev);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao acessar o banco de dados.' }); }
};
