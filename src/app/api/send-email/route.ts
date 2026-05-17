import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const emails = Array.isArray(to) ? to : [to];

    await resend.emails.send({
      from: 'CW <onboarding@resend.dev>',
      to: emails,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao enviar email:', err);
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
  }
}
