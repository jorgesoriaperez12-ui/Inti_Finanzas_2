// Prueba de carga con k6 (https://k6.io):
//   k6 run -e SITE=https://tu-dominio.com -e SB=https://xxxx.supabase.co -e KEY=tu_anon_key -e TOKEN=jwt_de_un_usuario_de_prueba tests/loadtest.k6.js
// Úsala SOLO en tu propio proyecto y con usuarios de prueba.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const web = http.get(`${__ENV.SITE}/app.html`);
  check(web, { 'app.html responde 200': (r) => r.status === 200 });

  if (__ENV.TOKEN) {
    const h = { apikey: __ENV.KEY, Authorization: `Bearer ${__ENV.TOKEN}` };
    const mov = http.get(`${__ENV.SB}/rest/v1/movimientos?select=*&order=fecha_emision.desc&limit=200`, { headers: h });
    check(mov, { 'movimientos 200': (r) => r.status === 200 });
    const mes = http.post(`${__ENV.SB}/rest/v1/rpc/resumen_mensual`, JSON.stringify({ meses: 24 }), { headers: { ...h, 'Content-Type': 'application/json' } });
    check(mes, { 'resumen mensual 200': (r) => r.status === 200 });
  }
  sleep(1);
}
