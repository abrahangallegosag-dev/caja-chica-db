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

async function leerComprobante(buffer, mimeType) {
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
  return JSON.parse(respuesta.text);
}

module.exports = { leerComprobante };
