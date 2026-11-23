// POST /api/confirm {id,n,e,por,ed}  -> registra confirmação
// GET  /api/confirm?ed=...           -> lista (exige header x-admin-password)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function cmd(args) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('kv ' + r.status);
  return (await r.json()).result;
}
const s = v => String(v || '').trim().slice(0, 100);
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Banco de dados não configurado.' });
  try {
    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}');
      const d = { n: s(b.n), e: s(b.e), por: s(b.por), ed: s(b.ed), em: new Date().toISOString() };
      if (!d.n || !d.ed) return res.status(400).json({ error: 'Dados incompletos.' });
      const id = s(b.id) || (d.n + '|' + d.por).toLowerCase();
      await cmd(['HSET', 'confirm:' + d.ed, id, JSON.stringify(d)]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      const pass = process.env.ADMIN_PASSWORD;
      if (!pass || req.headers['x-admin-password'] !== pass) return res.status(401).json({ error: 'Senha incorreta.' });
      const ed = s(req.query.ed);
      const arr = await cmd(['HGETALL', 'confirm:' + ed]) || [];
      const list = [];
      for (let i = 1; i < arr.length; i += 2) { try { list.push(JSON.parse(arr[i])); } catch (e) {} }
      list.sort((a, b) => (a.em < b.em ? 1 : -1));
      return res.status(200).json(list);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) { res.status(500).json({ error: 'Erro no banco de dados.' }); }
};
