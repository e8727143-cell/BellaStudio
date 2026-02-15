import { GoogleGenAI } from "@google/genai";

// --- GESTIÓN DE API KEYS (STICKY STRATEGY) ---

// 1. Obtener todas las llaves disponibles del entorno
const getApiKeysPool = (): string[] => {
  // Leemos la variable definida en Vite/Vercel
  const poolString = process.env.API_KEYS_POOL || "";
  
  // Limpiamos espacios y filtramos entradas vacías
  let keys = poolString.split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  // Fallback: Si no hay pool, intentamos leer la llave única antigua
  const singleKey = process.env.API_KEY;
  if (keys.length === 0 && singleKey) {
    keys.push(singleKey);
  }

  return keys;
};

// 2. Función para ordenar las llaves: La "Pegajosa" va PRIMERO
const getPrioritizedKeys = (): string[] => {
  const allKeys = getApiKeysPool();
  if (allKeys.length === 0) return [];

  // Recuperamos la llave que funcionó la última vez
  const stickyKey = localStorage.getItem("gemini_sticky_key");

  let orderedKeys = [...allKeys];

  if (stickyKey && allKeys.includes(stickyKey)) {
    // Si tenemos una llave favorita válida:
    // 1. La sacamos de la lista
    const others = orderedKeys.filter(k => k !== stickyKey);
    // 2. Mezclamos las demás para balanceo de carga si la favorita falla
    const shuffledOthers = shuffleArray(others);
    // 3. Ponemos la favorita AL PRINCIPIO
    orderedKeys = [stickyKey, ...shuffledOthers];
  } else {
    // Si no hay favorita, mezclamos todo al azar para empezar
    orderedKeys = shuffleArray(orderedKeys);
  }

  return orderedKeys;
};

// --- UTILIDADES DE IMAGEN ---

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

const processTemplateImage = (file: File, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("No context")); return; }
      canvas.width = width;
      canvas.height = height;
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width / scale - img.width) / 2;
      const y = (height / scale - img.height) / 2;
      ctx.drawImage(img, x * scale, y * scale, img.width * scale, img.height * scale);
      const dataUrl = canvas.toDataURL(file.type);
      const base64 = dataUrl.split(',')[1];
      URL.revokeObjectURL(objectUrl);
      resolve(base64);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed load template")); };
    img.src = objectUrl;
  });
};

const cropOutputToExactSize = (base64Str: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       if (!ctx) { reject(new Error("No context")); return; }
       canvas.width = targetWidth;
       canvas.height = targetHeight;
       const sourceRatio = img.width / img.height;
       const targetRatio = targetWidth / targetHeight;
       let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
       if (sourceRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
       } else {
          sHeight = img.width / targetRatio;
          sy = (img.height - sHeight) / 2;
       }
       ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
       resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
  });
};

function shuffleArray(array: string[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- DIAGNÓSTICO ---
export interface KeyStatus {
  key: string;
  status: 'ok' | 'error';
  latency: number;
  message?: string;
}

export const checkAllKeys = async (): Promise<KeyStatus[]> => {
  const results: KeyStatus[] = [];
  const allKeys = getApiKeysPool();

  if (allKeys.length === 0) {
    console.warn("No API Keys found.");
    return [];
  }

  // Nota: Esto prueba todas las llaves para darte un reporte,
  // pero la función de generación es estricta (una a la vez).
  for (const key of allKeys) {
    const start = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite', 
        contents: { parts: [{ text: 'ping' }] }
      });
      
      results.push({
        key: key,
        status: 'ok',
        latency: Date.now() - start
      });

    } catch (error: any) {
      let errorMsg = error.message || JSON.stringify(error);
      let shortMsg = 'ERROR';

      if (errorMsg.includes('429')) shortMsg = 'CUOTA AGOTADA';
      else if (errorMsg.includes('limit: 0')) shortMsg = 'BLOQUEADO (Limit 0)';
      else if (errorMsg.includes('400')) shortMsg = 'BAD REQUEST';
      else if (errorMsg.includes('403')) shortMsg = 'KEY INVÁLIDA';
      else if (errorMsg.includes('404')) shortMsg = 'NO ENCONTRADO';
      
      results.push({
        key: key,
        status: 'error',
        latency: Date.now() - start,
        message: shortMsg
      });
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
};


// --- GENERACIÓN PRINCIPAL ---

export const generateShoeMockup = async (
  shoeFile: File, 
  templateFile: File | undefined,
  aspectRatioInput: string
): Promise<string> => {
  
  const shoeBase64 = await fileToBase64(shoeFile);

  // Configuración de dimensiones
  let apiAspectRatio = "1:1";
  let inputWidth = 1080; let inputHeight = 1080;
  let finalWidth = 1080; let finalHeight = 1080;

  if (aspectRatioInput === "1:1") {
    apiAspectRatio = "1:1";
    inputWidth = 1080; inputHeight = 1080;
    finalWidth = 1080; finalHeight = 1080;
  } else if (aspectRatioInput === "9:16") {
    apiAspectRatio = "9:16";
    inputWidth = 1080; inputHeight = 1920;
    finalWidth = 1080; finalHeight = 1920;
  } else if (aspectRatioInput === "4:5") {
    apiAspectRatio = "3:4";
    inputWidth = 1080; inputHeight = 1440;
    finalWidth = 1080; finalHeight = 1350;
  }

  const cleaningInstructions = `
    CRITICAL: REMOVE ALL BOXES/PACKAGING.
    1. EXTRACT ONLY THE SHOES.
    2. Place shoes DIRECTLY on the surface.
    3. Realistic lighting and shadows.
  `;

  let parts: any[] = [];
  let prompt = "";

  if (templateFile) {
    const processedTemplateBase64 = await processTemplateImage(templateFile, inputWidth, inputHeight);
    prompt = `Composite shoes into background. ${cleaningInstructions}`;
    parts = [
      { inlineData: { mimeType: "image/png", data: processedTemplateBase64 } },
      { inlineData: { mimeType: shoeFile.type, data: shoeBase64 } },
      { text: prompt }
    ];
  } else {
    prompt = `High-end footwear photography. Shoes on wooden table. Background: vertical garden with white roses and "BELLA" sign. ${cleaningInstructions}`;
    parts = [
      { inlineData: { mimeType: shoeFile.type, data: shoeBase64 } },
      { text: prompt }
    ];
  }

  // --- LÓGICA DE ROTACIÓN SECUENCIAL ESTRICTA ---
  
  // 1. Definimos los modelos a probar por cada llave
  // (Primero el rápido, si falla por cuota, el Pro)
  const MODELS_TO_TRY = [
    'gemini-2.5-flash-image',       
    'gemini-3-pro-image-preview'    
  ];
  
  // 2. Obtenemos las llaves ordenadas (La "Sticky" va primero)
  const prioritizedKeys = getPrioritizedKeys();
  if (prioritizedKeys.length === 0) {
    throw new Error("No hay API Keys configuradas.");
  }

  let lastError: any = null;

  // 3. Iteramos las llaves UNA POR UNA
  for (let i = 0; i < prioritizedKeys.length; i++) {
    const currentKey = prioritizedKeys[i];
    const ai = new GoogleGenAI({ apiKey: currentKey });
    let keyFailedByQuota = false;

    // Probamos los modelos disponibles para esta llave
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`[Intento] Key #${i+1} (${currentKey.slice(-4)}) -> Modelo: ${modelName}`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: { imageConfig: { aspectRatio: apiAspectRatio } }
        });

        if (response.promptFeedback?.blockReason) {
           throw new Error(`Bloqueo de seguridad: ${response.promptFeedback.blockReason}`);
        }

        const outputParts = response.candidates?.[0]?.content?.parts;
        if (!outputParts || outputParts.length === 0) throw new Error("Generación vacía");

        for (const part of outputParts) {
          if (part.inlineData && part.inlineData.data) {
            const rawBase64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            
            // ÉXITO !!
            // Marcamos esta llave como "Sticky" para usarla primero la próxima vez
            console.log(`[Éxito] Key #${i+1} funcionó. Guardando como preferida.`);
            localStorage.setItem("gemini_sticky_key", currentKey);
            
            return await cropOutputToExactSize(`data:${mimeType};base64,${rawBase64}`, finalWidth, finalHeight);
          }
        }
        
      } catch (error: any) {
        lastError = error;
        const msg = (error.message || '').toLowerCase();
        
        // ANALISIS DE ERROR
        // Si es error de cuota (429, limit 0) o no encontrado (404), debemos probar el siguiente modelo o siguiente llave
        if (msg.includes('429') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('404')) {
           console.warn(`[Fallo Cuota/Modelo] Key #${i+1} - ${modelName}: ${msg}`);
           // Si falla el último modelo de la lista, marcamos la llave como fallida por cuota
           if (modelName === MODELS_TO_TRY[MODELS_TO_TRY.length - 1]) {
             keyFailedByQuota = true;
           }
           continue; // Intentar siguiente modelo
        }

        // Si es otro error (ej: Permisos, API Key invalida), paramos de intentar con esta llave
        console.error(`[Error Fatal] Key #${i+1}: ${msg}`);
        break; 
      }
    }
    
    // Si la llave falló por cuota (todos sus modelos fallaron), la "olvidamos" del sticky y pasamos a la siguiente
    if (keyFailedByQuota) {
      console.warn(`[Cambio de Key] La llave ...${currentKey.slice(-4)} se agotó. Cambiando a la siguiente...`);
      // Si esta era la sticky, la borramos para que no se priorice la proxima vez
      if (localStorage.getItem("gemini_sticky_key") === currentKey) {
        localStorage.removeItem("gemini_sticky_key");
      }
      // Pausa de seguridad antes de la siguiente llave
      await new Promise(r => setTimeout(r, 500));
      continue;
    } 
    
    // Si llegamos aquí y lastError existe pero no fue por cuota (ej: error de red), tal vez debamos intentar otra llave
    // Pero si tuvimos éxito, ya se retornó arriba.
  }

  console.error("Todas las llaves se han agotado o fallado.");
  throw new Error(`Sistema completamente saturado. Último error: ${lastError?.message}`);
};