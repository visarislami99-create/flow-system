import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Always log — fallback capture while Resend domain DNS propagates
  console.log(`[AutoFlows signup] ${new Date().toISOString()} — ${email}`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AutoFlows <notifications@getautoflows.com>',
        to: ['visar.islami.99@gmail.com'],
        subject: 'New AutoFlows signup',
        html: `<p>New signup: <strong>${email}</strong></p><p>Submitted at ${new Date().toISOString()}</p>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[AutoFlows] Resend error ${res.status}: ${body}`);
      // Return 200 anyway — email is logged above, UX must not break
      return NextResponse.json({ ok: true, resend: 'degraded' });
    }
  } catch (err) {
    console.error('[AutoFlows] Resend fetch threw:', err);
    // Same: still report success to client
    return NextResponse.json({ ok: true, resend: 'degraded' });
  }

  return NextResponse.json({ ok: true });
}
