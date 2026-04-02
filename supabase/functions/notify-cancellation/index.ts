import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface CancellationPayload {
  email: string
  display_name: string
  date: string
  start_time: string
  end_time: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: CancellationPayload = await req.json()
    const { email, display_name, date, start_time, end_time } = payload

    const formattedDate = date.split('-').reverse().join('.')

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Posilovna <onboarding@resend.dev>',
        to: [email],
        subject: 'Vaše rezervace byla zrušena',
        html: `
          <h2>Dobrý den, ${display_name}</h2>
          <p>Vaše rezervace byla zrušena správcem.</p>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Čas:</strong> ${start_time} – ${end_time}</p>
          <p>Pokud máte dotazy, kontaktujte správce.</p>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
