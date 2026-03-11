import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TryOnBody = {
  personImage: string;
  garmentImage: string;
  prompt?: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.TRYON_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing TRYON_API_KEY env var' }, { status: 500 });
    }

    const body = (await req.json()) as TryOnBody;
    if (!body?.personImage || !body?.garmentImage) {
      return NextResponse.json({ error: 'personImage and garmentImage are required' }, { status: 400 });
    }

    const version = process.env.TRYON_MODEL_VERSION;
    if (!version) {
      return NextResponse.json(
        { error: 'Missing TRYON_MODEL_VERSION env var (Replicate model version id)' },
        { status: 500 },
      );
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: {
          person_image: body.personImage,
          garment_image: body.garmentImage,
          prompt:
            body.prompt ??
            'Generate a realistic ecommerce virtual try-on image. Preserve face identity and scene.',
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Replicate create failed: ${errText}` }, { status: 502 });
    }

    const created = (await createRes.json()) as { id: string; status: string; urls?: { get?: string }; output?: string | string[] };

    let result = created;
    let tries = 0;
    while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled' && tries < 60) {
      tries += 1;
      await new Promise((r) => setTimeout(r, 1500));

      const pollRes = await fetch(result.urls?.get ?? `https://api.replicate.com/v1/predictions/${created.id}`, {
        headers: { Authorization: `Token ${apiKey}` },
      });

      if (!pollRes.ok) {
        const errText = await pollRes.text();
        return NextResponse.json({ error: `Replicate poll failed: ${errText}` }, { status: 502 });
      }

      result = (await pollRes.json()) as typeof result;
    }

    if (result.status !== 'succeeded') {
      return NextResponse.json({ error: `Try-on failed with status: ${result.status}` }, { status: 502 });
    }

    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!output) {
      return NextResponse.json({ error: 'Try-on completed but no output returned' }, { status: 502 });
    }

    return NextResponse.json({ image: output });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
