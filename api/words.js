// GET：遊戲讀取目前題庫（公開）  POST：管理員儲存新版本（需登入）
import { authed, send, body, listVersions, readVersion, cleanWords, saveVersion } from './_lib.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const v = await listVersions();
      if (!v.length) return send(res, 200, { words: null }, 'no-store');
      const data = await readVersion(v[0].pathname);
      return send(res, 200, { id: v[0].pathname, ...data }, 'public, s-maxage=5, stale-while-revalidate=30');
    }
    if (req.method === 'POST') {
      if (!authed(req)) return send(res, 401, { error: '請重新登入' });
      const { words, note } = await body(req);
      let clean; try { clean = cleanWords(words); } catch (e) { return send(res, 400, { error: e.message }); }
      const saved = await saveVersion(clean, note);
      return send(res, 200, { ok: true, ...saved });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: '雲端資料庫錯誤：' + (e.message || e) });
  }
}
