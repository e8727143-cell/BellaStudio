import { GoogleGenAI } from "@google/genai";

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

// Helper 1: Crop/Resize INPUT template to dimensions that match the API's native aspect ratio
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

      // Calculate "object-fit: cover" logic
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

// Helper 2: Post-process the OUTPUT from AI to exact user dimensions
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

export const generateShoeMockup = async (
  shoeFile: File, 
  templateFile: File | undefined,
  aspectRatioInput: string
): Promise<string> => {
  // API Key must be obtained exclusively from process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const shoeBase64 = await fileToBase64(shoeFile);

  // LOGIC CONFIGURATION
  let apiAspectRatio = "1:1";
  let inputWidth = 1080;
  let inputHeight = 1080;
  
  // Output targets
  let finalWidth = 1080;
  let finalHeight = 1080;

  if (aspectRatioInput === "1:1") {
    apiAspectRatio = "1:1";
    inputWidth = 1080;
    inputHeight = 1080;
    finalWidth = 1080;
    finalHeight = 1080;
  } 
  else if (aspectRatioInput === "9:16") {
    apiAspectRatio = "9:16";
    inputWidth = 1080;
    inputHeight = 1920;
    finalWidth = 1080;
    finalHeight = 1920;
  }
  else if (aspectRatioInput === "4:5") {
    apiAspectRatio = "3:4";
    inputWidth = 1080;
    inputHeight = 1440;
    finalWidth = 1080;
    finalHeight = 1350;
  }

  let prompt = "";
  let parts: any[] = [];

  const cleaningInstructions = `
    CRITICAL INSTRUCTION - BOX REMOVAL:
    You are strictly forbidden from including any boxes, cardboard, or packaging in the final image.
    1. EXTRACT ONLY THE SHOES from the input image.
    2. DISCARD the box, the lid, and any tissue paper.
    3. The shoes must be placed DIRECTLY on the wooden table surface.
  `;

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: apiAspectRatio
        }
      }
    });

    const outputParts = response.candidates?.[0]?.content?.parts;
    
    if (!outputParts) {
      throw new Error("API returned no content. Check model availability.");
    }

    for (const part of outputParts) {
      if (part.inlineData && part.inlineData.data) {
        const rawBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        const rawImageUrl = `data:${mimeType};base64,${rawBase64}`;
        const finalImageUrl = await cropOutputToExactSize(rawImageUrl, finalWidth, finalHeight);
        return finalImageUrl;
      }
    }

    throw new Error("The AI generation succeeded but returned no image data.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};