import { Player, CWSession, CWFormat, FORMAT_SIZES } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cw-app.vercel.app';

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;max-width:560px;width:100%;">
      <tr><td style="background:#0a2a1a;padding:24px 32px;border-bottom:1px solid #00ff8820;">
        <span style="color:#00ff88;font-size:28px;font-weight:900;letter-spacing:6px;">CW</span>
      </td></tr>
      <tr><td style="padding:32px;">
        ${content}
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #1e1e2e;text-align:center;">
        <a href="${BASE_URL}" style="color:#00ff88;font-size:13px;text-decoration:none;">Abrir o CW →</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#00ff88;color:#0a0a0f;font-weight:900;font-size:13px;letter-spacing:2px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-top:20px;">${label}</a>`;
}

function h(text: string): string {
  return `<h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px 0;">${text}</h2>`;
}

function sub(text: string): string {
  return `<p style="color:#666;font-size:13px;margin:0 0 24px 0;">${text}</p>`;
}

function badge(text: string): string {
  return `<span style="background:#0a2a1a;color:#00ff88;font-weight:800;font-size:14px;letter-spacing:1px;padding:6px 14px;border-radius:8px;border:1px solid #00ff8830;">${text}</span>`;
}

function info(label: string, value: string): string {
  return `<tr>
    <td style="color:#555;font-size:13px;padding:8px 0;border-bottom:1px solid #1e1e2e;">${label}</td>
    <td style="color:#fff;font-size:13px;font-weight:700;padding:8px 0;border-bottom:1px solid #1e1e2e;text-align:right;">${value}</td>
  </tr>`;
}

// ── Templates ────────────────────────────────────────────────────

export function emailNewCW(session: CWSession, cwUrl: string): string {
  const time = session.closingTime
    ? session.closingTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return emailWrapper(`
    ${h('🎮 CW aberta!')}
    ${sub(`${session.createdBy} abriu uma nova CW. Corre que as vagas são limitadas!`)}
    <div style="margin-bottom:20px;">${badge(session.format)}</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${info('Formato', session.format)}
      ${info('Vagas', String(FORMAT_SIZES[session.format as CWFormat]))}
      ${info('Fecha às', time)}
      ${info('Sorteio de times', session.sortTeams ? 'Sim' : 'Não')}
    </table>
    ${btn('ENTRAR NA CW', cwUrl)}
  `);
}

export function emailAlmostFull(session: CWSession, remaining: number, cwUrl: string): string {
  const time = session.closingTime
    ? session.closingTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return emailWrapper(`
    ${h(`⚡ Falta${remaining > 1 ? 'm' : ''} ${remaining} vaga${remaining > 1 ? 's' : ''}!`)}
    ${sub(`A CW ${session.format} está quase completa. Entra logo antes de fechar!`)}
    <div style="margin-bottom:20px;">${badge(`${remaining} vaga${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`)}</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${info('Formato', session.format)}
      ${info('Fecha às', time)}
    </table>
    ${btn('QUERO JOGAR', cwUrl)}
  `);
}

export function emailClosed(session: CWSession, playerName: string, status: 'confirmed' | 'waiting', cwUrl: string): string {
  const isConfirmed = status === 'confirmed';
  const teamsHtml = session.teamA && session.teamB ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td width="48%" style="background:#0a2a1a;border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#00ff88;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:10px;">TIME A</div>
          ${session.teamA.map(p => `<div style="color:${p === playerName ? '#00ff88' : '#fff'};font-weight:${p === playerName ? '900' : '400'};font-size:14px;padding:4px 0;">${p}${p === playerName ? ' (você)' : ''}</div>`).join('')}
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#0a1a2a;border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#00aaff;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:10px;">TIME B</div>
          ${session.teamB.map(p => `<div style="color:${p === playerName ? '#00aaff' : '#fff'};font-weight:${p === playerName ? '900' : '400'};font-size:14px;padding:4px 0;">${p}${p === playerName ? ' (você)' : ''}</div>`).join('')}
        </td>
      </tr>
    </table>
  ` : '';

  return emailWrapper(`
    ${h(isConfirmed ? '✅ CW fechada! Você está dentro.' : '⏳ CW fechada. Você ficou na fila.')}
    ${sub(isConfirmed
      ? `A CW ${session.format} foi fechada. Você está confirmado${session.sortTeams ? ' — veja os times abaixo.' : '!'}`
      : `Você ficou na fila desta CW. Mas não se preocupa — você tem prioridade na próxima!`
    )}
    ${teamsHtml}
    ${btn('VER DETALHES', cwUrl)}
  `);
}

// ── Disparador ───────────────────────────────────────────────────

export async function sendEmails(
  players: Player[],
  type: 'newCW' | 'almostFull' | 'closed',
  session: CWSession,
  cwUrl: string,
  remaining?: number
) {
  const eligible = players.filter(p => {
    if (type === 'newCW') return p.notifyNewCW;
    if (type === 'almostFull') return p.notifyAlmostFull;
    if (type === 'closed') return p.notifyClosed;
    return false;
  });

  if (eligible.length === 0) return;

  for (const player of eligible) {
    let subject = '';
    let html = '';

    if (type === 'newCW') {
      subject = `🎮 CW aberta — ${session.format} às ${session.closingTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      html = emailNewCW(session, cwUrl);
    } else if (type === 'almostFull' && remaining !== undefined) {
      subject = `⚡ Falta${remaining > 1 ? 'm' : ''} ${remaining} vaga${remaining > 1 ? 's' : ''} na CW ${session.format}!`;
      html = emailAlmostFull(session, remaining, cwUrl);
    } else if (type === 'closed') {
      subject = `${player.status === 'confirmed' ? '✅ Você está dentro' : '⏳ Você ficou na fila'} — CW ${session.format} fechada`;
      html = emailClosed(session, player.name, player.status, cwUrl);
    }

    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: player.email, subject, html }),
    });
  }
}
