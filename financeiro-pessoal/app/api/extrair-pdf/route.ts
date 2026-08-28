import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return NextResponse.json({ text: result.text });
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o PDF." }, { status: 422 });
  }
}
