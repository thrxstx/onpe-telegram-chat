import type { VercelRequest, VercelResponse } from "@vercel/node";

const CONFIG = {
  telegramUser: process.env.TELEGRAM_USER ?? "",
  callmebotApiKey: process.env.CALLMEBOT_API_KEY ?? "",
  onpeUrl:
    "https://resultadosegundavuelta.onpe.gob.pe/presentacion-backend/resumen-general/participantes?idEleccion=10&tipoFiltro=eleccion",
};

// ---- Tipos ------------------------------------------------

interface Candidato {
  nombre: string;
  porcentaje: number;
  votos: number;
}

interface ResultadoONPE {
  candidatos: Candidato[];
  porcentajeAvance: number;
}

// ---- Fetch ONPE -------------------------------------------

async function fetchResultados(): Promise<ResultadoONPE | null> {
  try {
    const res = await fetch(CONFIG.onpeUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: "https://resultadosegundavuelta.onpe.gob.pe/",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return parseONPE(data);
  } catch {
    return null;
  }
}

function parseONPE(data: any): ResultadoONPE {
  const candidatos: Candidato[] = (data.data ?? []).map((p: any) => ({
    nombre: p.nombreCandidato ?? p.nombreAgrupacionPolitica ?? "Desconocido",
    porcentaje: parseFloat(p.porcentajeVotosValidos ?? 0),
    votos: parseInt(p.totalVotosValidos ?? 0),
  }));

  const porcentajeAvance = parseFloat(
    (data.data?.[0]?.porcentajeVotosEmitidos ?? 0).toFixed(2)
  );

  return { candidatos, porcentajeAvance };
}

// ---- Telegram via CallMeBot --------------------------------

async function sendTelegram(mensaje: string): Promise<void> {
  const encoded = encodeURIComponent(mensaje);
  const user = encodeURIComponent(CONFIG.telegramUser);
  const url = `https://api.callmebot.com/telegram.php?user=${user}&text=${encoded}&apikey=${CONFIG.callmebotApiKey}`;
  await fetch(url);
}

// ---- Formatear mensaje ------------------------------------

const nombreCorto = (n: string) => {
  const partes = n.trim().split(" ");
  return partes[0] + " " + (partes[1] ?? "");
};

function formatMensaje(r: ResultadoONPE, final = false): string {
  const sorted = [...r.candidatos].sort((a, b) => b.porcentaje - a.porcentaje);
  if (sorted.length < 2) return "⚠️ No se pudieron leer los datos de la ONPE.";

  const [primero, segundo] = sorted;
  const difPct = (primero.porcentaje - segundo.porcentaje).toFixed(3);
  const difVotos = (primero.votos - segundo.votos).toLocaleString("es-PE");
  const hora = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  const lines = [
    `🗳 ONPE - Segunda Vuelta | ${hora}`,
    `📊 Votos emitidos contados: ${r.porcentajeAvance}%`,
    ``,
    `🟢 ${nombreCorto(primero.nombre)}: ${primero.porcentaje}% (${primero.votos.toLocaleString("es-PE")} votos)`,
    `🔴 ${nombreCorto(segundo.nombre)}: ${segundo.porcentaje}% (${segundo.votos.toLocaleString("es-PE")} votos)`,
    ``,
    `📌 Diferencia: ${difPct} pts | ${difVotos} votos`,
    ...(final ? [``, `✅ Conteo al 100% completado.`] : []),
  ];

  return lines.join("\n");
}

// ---- Handler principal ------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seguridad: solo acepta llamadas del cron de Vercel o con token correcto
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const resultado = await fetchResultados();

  if (!resultado) {
    return res.status(500).json({ error: "No se pudo obtener datos de la ONPE" });
  }

  const msg = formatMensaje(resultado, resultado.porcentajeAvance >= 100);
  await sendTelegram(msg);

  return res.status(200).json({
    ok: true,
    avance: resultado.porcentajeAvance,
    candidatos: resultado.candidatos,
  });
}
