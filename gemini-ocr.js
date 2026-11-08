// ============================================================
//  Lectura de comprobantes con Google Gemini (visión + manuscrito)
//  SDK: @google/genai
// ============================================================
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelo Flash. Verifica el nombre vigente en aistudio.google.com y cámbialo aquí si hace falta.
const MODELO = 'gemini-3.8-flash';

const schemaComprobante = {
  type: Type.OBJECT,
  properties: {
    fecha:            { type: Type.STRING,  description: 'Fecha en formato dd/mm/aaaa. Si no se ve, cadena vacía.' },
    establecimiento:  { type: Type.STRING,  description: 'Nombre del local o proveedor.' },
    ruc:              { type: Type.STRING,  description: 'RUC del emisor (13 dígitos). Si no se ve, cadena vacía.' },
    numero_documento: { type: Type.STRING,  description: 'Número del comprobante, ej 001-001-000000123.' },
    concepto:         { type: Type.STRING,  description: 'Concepto del gasto (ALMUERZO, AGUA, MERIENDA, etc.).' },
    valor_sin_iva:    { type: Type.NUMBER,  description: 'Subtotal sin IVA. Si no se ve, 0.' },
    iva:              { type: Type.NUMBER,  description: 'Valor del IVA. Si no se ve, 0.' },
    total:            { type: Type.NUMBER,  description: 'Valor total. Si no se ve, 0.' },
    manuscrito:       { type: Type.BOOLEAN, description: 'true si el total u otro dato clave estaba escrito a mano.' },
    confianza_total:  { type: Type.STRING,  enum: ['alta','media','baja'], description: 'Qué tan seguro estás del total.' }
  },
  required: ['fecha','establecimiento','numero_documento','concepto','valor_sin_iva','iva','total','manuscrito','confianza_total']
};

const INSTRUCCION = `Eres un asistente que lee comprobantes de caja chica de Ecuador
(facturas y notas de venta). El comprobante tiene una parte impresa y a veces campos
rellenados a mano con lápiz o bolígrafo (sobre todo el concepto y el valor).
Extrae los datos al JSON pedido. Reglas:
- Fechas en formato dd/mm/aaaa.
- Valores numéricos como números, sin el símbolo $.
- Si un dato no aparece o no lo puedes leer con seguridad, cadena vacía o 0.
- "manuscrito": true si el total u otro dato clave estaba a mano.
- "confianza_total": alta, media o baja según qué tan seguro estés del total.
- NUNCA inventes un número. Si dudas, pon 0 y confianza "baja".`;

// Pausa de ms milisegundos
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

async function leerComprobante(buffer, mimeType) {
  const MAX_INTENTOS = 3;           // hasta 3 intentos (equilibrio entre no fallar y no tardar)
  const ESPERAS = [0, 1500, 3000];  // pausa antes de cada intento (0, 1.5s, 3s)

  let ultimoError = null;
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (ESPERAS[intento]) await dormir(ESPERAS[intento]);
    try {
      const respuesta = await ai.models.generateContent({
        model: MODELO,
        contents: [{
          role: 'user',
          parts: [
            { text: INSTRUCCION },
            { inlineData: { mimeType: mimeType, data: buffer.toString('base64') } }
          ]
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schemaComprobante,
          temperature: 0
        }
      });
      return JSON.parse(respuesta.text);   // éxito: salimos
    } catch (e) {
      ultimoError = e;
      const msg = String(e.message || '');
      // Solo reintentar si es saturación (503) o sobrecarga; otros errores no se reintentan
      const esSaturacion = msg.includes('503') || /overload|unavailable|high demand/i.test(msg);
      if (!esSaturacion) throw e;        // error distinto: fallar de una vez
      // si fue saturación, el bucle reintenta tras la pausa
    }
  }
  // Se agotaron los intentos
  throw new Error('El servicio de IA está muy ocupado en este momento (saturación de Google). Intenta de nuevo en un minuto.');
}

module.exports = { leerComprobante };
