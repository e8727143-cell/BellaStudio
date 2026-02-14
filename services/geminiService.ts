import { GoogleGenAI } from "@google/genai";

// --- POOL DE API KEYS ---
// Lista de llaves para rotación y balanceo de carga
const API_KEYS_POOL = [
  "AIzaSyCIQA8vnqtaEtJaU877F3K_I5r4VQQT0hQ",
  "AIzaSyAhed6gKBHYpzPSXJg9uNqELSrUZrhyo7c",
  "AIzaSyAZzkR1RwIThgXJBfqpSR1oI6IKwtSqQa0",
  "AIzaSyDP1J8ZRcSy99ezrUDEtG9rOvlIYOHQVXM",
  "AIzaSyCyj2mOnjnixihLHIeVcrvXdcWGv2gfoL4",
  "AIzaSyApH6Ta6sAlwFEz4y4U1iEjXWNvfr8vmS0",
  "AIzaSyA4tKuXBKuhQVdQvuyyTEmwDEKOmrR3SuE",
  "AIzaSyD6xpHI18xAbrVIThJlx5S0iznqNkyFtZs",
  "AIzaSyDxh8apC2zykOvsJtBQKtGXbCQ__-ZCjm4",
  "AIzaSyCNuLcOpIIE259j__bGdagY9DKa1pU_uiU",
  "AIzaSyBE3eXTJRkEqxja--Au9ctlt1jZ7uLlmbU",
  "AIzaSyDKvo2bjPwv_3l6dR5UQXQvfvrBh-5tpp8",
  "AIzaSyAFE-ydwIHSgc1qM4fGkUnpr1bwPFxKcbQ",
  "AIzaSyDrsw_XAbXl-ay7olCUwYmCy0O0uDcsBD8"
];

// --- DIAGNOSTICO ---
export interface KeyStatus {
  key: string;
  status: 'ok' | 'error';
  latency: number;
  message?: string;
}

export const checkAllKeys = async (): Promise<KeyStatus[]> => {
  const results: KeyStatus[] = [];
  
  // Incluimos la key de entorno si existe
  const allKeys = [...API_KEYS_POOL];
  if (process.env.API_KEY && !API_KEYS_POOL.includes(process.env.API_KEY)) {
    allKeys.push(process.env.API_KEY);
  }

  // MODIFICACIÓN: Ejecución SECUENCIAL (uno por uno)
  // Lanzar 14 peticiones simultáneas dispara los filtros anti-abuso de Google por IP.
  for (const key of allKeys) {
    const start = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      // Usamos el modelo más básico y estable para el ping
      await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest', 
        contents: { parts: [{ text: 'ping' }] }
      });
      
      results.push({
        key: key,
        status: 'ok',
        latency: Date.now() - start
      });

    } catch (error: any) {
      const errorMsg = error.message || '';
      let statusMsg = 'ERROR GENÉRICO';
      
      if (errorMsg.includes('429')) statusMsg = 'CUOTA EXCEDIDA';
      if (errorMsg.includes('fetch')) statusMsg = 'ERROR RED';
      if (errorMsg.includes('API key not valid')) statusMsg = 'KEY INVÁLIDA';

      results.push({
        key: key,
        status: 'error',
        latency: Date.now() - start,
        message: statusMsg
      });
    }
    // Pequeña pausa de 200ms entre chequeos para ser amable con la API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
};

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
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not create canvas context"));
        return;
      }
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load template image for processing"));
    };
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

export const generateShoeMockup = async (
  shoeFile: File, 
  templateFile: File | undefined,
  aspectRatioInput: string
): Promise<string> => {
  
  const shoeBase64 = await fileToBase64(shoeFile);

  // Configuración de dimensiones
  let apiAspectRatio = "1:1";
  let inputWidth = 1080;
  let inputHeight = 1080;
  let finalWidth = 1080;
  let finalHeight = 1080;

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
    CRITICAL INSTRUCTION - BOX REMOVAL:
    You are strictly forbidden from including any boxes, cardboard, or packaging in the final image.
    1. EXTRACT ONLY THE SHOES from the input image.
    2. DISCARD the box, the lid, and any tissue paper.
    3. The shoes must be placed DIRECTLY on the wooden table surface.
  `;

  let parts: any[] = [];
  let prompt = "";

  if (templateFile) {
    const processedTemplateBase64 = await processTemplateImage(templateFile, inputWidth, inputHeight);
    prompt = `
      You are an expert digital compositor.
      INPUTS:
      - Image 1: Background Stage (Fixed).
      - Image 2: Product (Shoes).
      TASK:
      Composite the shoes from Image 2 onto the table in Image 1.
      ${cleaningInstructions}
      STRICT VISUAL RULES:
      1. Use Image 1 EXACTLY as provided. Do not stretch or warp the background.
      2. Place the shoes centrally on the wooden surface.
      3. Create realistic shadows on the wood.
    `;
    parts = [
      { inlineData: { mimeType: "image/png", data: processedTemplateBase64 } },
      { inlineData: { mimeType: shoeFile.type, data: shoeBase64 } },
      { text: prompt }
    ];
  } else {
    prompt = `
      Create a high-end commercial footwear mockup.
      ${cleaningInstructions}
      Scene:
      The shoes are sitting on a polished wooden round table.
      Behind them is a vertical garden wall with white roses and a beige circle sign saying "BELLA".
      Style: Photorealistic, studio lighting.
    `;
    parts = [
      { inlineData: { mimeType: shoeFile.type, data: shoeBase64 } },
      { text: prompt }
    ];
  }

  // --- LOGICA DE ROTACIÓN DE KEYS ---
  
  const rotatedKeys = shuffleArray(API_KEYS_POOL);
  if (process.env.API_KEY && !API_KEYS_POOL.includes(process.env.API_KEY)) {
    rotatedKeys.push(process.env.API_KEY);
  }

  let lastError: any = null;

  for (let i = 0; i < rotatedKeys.length; i++) {
    const currentKey = rotatedKeys[i];
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: apiAspectRatio } }
      });

      if (response.promptFeedback?.blockReason) {
         console.warn(`Key #${i+1} bloqueó el contenido por seguridad.`);
         throw new Error(`Bloqueo: ${response.promptFeedback.blockReason}`);
      }

      const outputParts = response.candidates?.[0]?.content?.parts;
      
      if (!outputParts || outputParts.length === 0) {
        throw new Error("Generación vacía");
      }

      for (const part of outputParts) {
        if (part.inlineData && part.inlineData.data) {
          const rawBase64 = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          const rawImageUrl = `data:${mimeType};base64,${rawBase64}`;
          return await cropOutputToExactSize(rawImageUrl, finalWidth, finalHeight);
        }
      }
      throw new Error("Sin imagen en la respuesta");

    } catch (error: any) {
      console.warn(`Error en Key #${i + 1} (${currentKey.slice(-4)}):`, error.message);
      lastError = error;

      if (i < rotatedKeys.length - 1) {
        // Pausa de 1 segundo antes de intentar la siguiente llave para evitar "Rate Limit" por velocidad
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  console.error("Todas las API Keys han fallado.");
  throw new Error(`Sistema saturado tras ${rotatedKeys.length} intentos. Último error: ${lastError?.message || 'Desconocido'}`);
};