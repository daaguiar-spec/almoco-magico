// POST /api/link {n,por,tel} -> {code}   |   GET /api/link?c=CODE -> {n,por,tel}
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const AB = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function cmd(args) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('kv ' + r.status);
  return (await r.json()).result;
}
const code = () => Array.from(require('crypto').randomBytes(5), b => AB[b % AB.length]).join('');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Banco de dados não configurado.' });
  try {
    if (req.method === 'GET') {
      const c = String(req.query.c || '').replace(/[^A-Za-z0-9]/g, '');
      const v = c && await cmd(['GET', 'link:' + c]);
      return v ? res.status(200).json(JSON.parse(v)) : res.status(404).json({ error: 'Convite não encontrado.' });
    }
    if (req.method === 'POST') {
      let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}');
      const s = v => String(v || '').trim().slice(0, 80);
      const d = { n: s(b.n), por: s(b.por), tel: s(b.tel).replace(/\D/g, '') };
      if (!d.n || !d.por || !d.tel) return res.status(400).json({ error: 'Dados incompletos.' });
      for (let i = 0; i < 5; i++) {
        const c = code();
        if (await cmd(['SET', 'link:' + c, JSON.stringify(d), 'NX', 'EX', 60 * 60 * 24 * 365]) === 'OK') return res.status(200).json({ code: c });
      }
      return res.status(500).json({ error: 'Tente novamente.' });
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) { res.status(500).json({ error: 'Erro no banco de dados.' }); }
};
