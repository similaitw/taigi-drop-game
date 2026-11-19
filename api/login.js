import { checkPassword, makeToken, send, body } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) return send(res, 500, { error: '伺服器尚未設定管理密碼（ADMIN_PASSWORD）' });
  const { password } = await body(req);
  if (!checkPassword(password)) {
    await new Promise(r => setTimeout(r, 900)); // 放慢猜密碼
    return send(res, 401, { error: '密碼錯誤' });
  }
  return send(res, 200, { token: makeToken(12), hours: 12 });
}
