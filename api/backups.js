// 備份版本：列表／讀取／還原（皆需登入）
import { authed, send, body, listVersions, readVersion, saveVersion, isId, parseId, KEEP } from './_lib.js';

export default async function handler(req, res) {
  if (!authed(req)) return send(res, 401, { error: '請重新登入' });
  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (id) {
        if (!isId(id)) return send(res, 400, { error: '版本代號錯誤' });
        const data = await readVersion(id);
        return data ? send(res, 200, { id, ...data }) : send(res, 404, { error: '找不到這個版本' });
      }
      const v = await listVersions();
      return send(res, 200, { keep: KEEP, versions: v.map(b => ({ id: b.pathname, size: b.size, ...parseId(b.pathname) })) });
    }
    if (req.method === 'POST') {
      const { restore } = await body(req);
      if (!isId(restore)) return send(res, 400, { error: '版本代號錯誤' });
      const data = await readVersion(restore);
      if (!data) return send(res, 404, { error: '找不到這個版本' });
      const t = new Date(parseId(restore).time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
      const saved = await saveVersion(data.words, `還原自 ${t} 的版本`);
      return send(res, 200, { ok: true, ...saved });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: '雲端資料庫錯誤：' + (e.message || e) });
  }
}
