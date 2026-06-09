export {};
const CONFIG = {
  telegramUser: process.env.TELEGRAM_USER ?? "thxrstx", // tu usuario de Telegram sin @
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
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "es-419,es;q=0.9",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: "https://resultadosegundavuelta.onpe.gob.pe/main/resumen",
        Origin: "https://resultadosegundavuelta.onpe.gob.pe",
      },
    });

    console.log("Status ONPE:", res.status);
    const text = await res.text();
    console.log("Respuesta ONPE:", text.slice(0, 300));

    if (!res.ok) return null;
    const data = JSON.parse(text);
    return parseONPE(data);
  } catch (err) {
    console.error("Error fetch:", String(err));
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
    (data.data?.[0]?.porcentajeVotosEmitidos ?? 0).toFixed(2),
  );

  return { candidatos, porcentajeAvance };
}

// ---- Telegram via CallMeBot --------------------------------

async function sendTelegram(mensaje: string): Promise<void> {
  const encoded = encodeURIComponent(mensaje);
  const url = `http://api.callmebot.com/text.php?user=${CONFIG.telegramUser}&text=${encoded}`;
  await fetch(url);
}

// ---- Formatear mensaje ------------------------------------

const nombreCorto = (n: string) => {
  const partes = n.trim().split(" ");
  return partes[0] + " " + (partes[1] ?? "");
};

function formatMensaje(r: ResultadoONPE, final = false): string {
  const sorted = [...r.candidatos].sort((a, b) => b.porcentaje - a.porcentaje);
  if (sorted.length < 2) return "No se pudieron leer los datos de la ONPE.";

  const [primero, segundo] = sorted;
  const difPct = (primero.porcentaje - segundo.porcentaje).toFixed(3);
  const difVotos = (primero.votos - segundo.votos).toLocaleString("es-PE");
  const hora = new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = [
    `ONPE - Segunda Vuelta | ${hora}`,
    `Avance: ${r.porcentajeAvance}%`,
    ``,
    `RS ${nombreCorto(primero.nombre)}: ${primero.porcentaje}% (${primero.votos.toLocaleString("es-PE")} votos)`,
    `KF ${nombreCorto(segundo.nombre)}: ${segundo.porcentaje}% (${segundo.votos.toLocaleString("es-PE")} votos)`,
    ``,
    `Diferencia: ${difPct} pts | ${difVotos} votos`,
    ...(final ? [``, `Conteo al 100% completado.`] : []),
  ];

  return lines.join("\n");
}

// ---- Handler principal ------------------------------------

// Reemplaza el handler de Vercel por esto:
const resultado = await fetchResultados();

if (!resultado) {
  console.error("No se pudo obtener datos de la ONPE");
  process.exit(1);
}

const msg = formatMensaje(resultado, resultado.porcentajeAvance >= 100);
await sendTelegram(msg);
console.log("Enviado:", msg);
