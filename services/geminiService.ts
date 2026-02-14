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
// This prevents the AI from distorting the image to fit its context window.
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
       
       // Center crop logic
       // The AI output might be larger (e.g., 3:4 is taller than 4:5), so we crop the top/bottom evenly.
       const sourceRatio = img.width / img.height;
       const targetRatio = targetWidth / targetHeight;
       
       let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
       
       if (sourceRatio > targetRatio) {
          // Source is wider than target: Crop width
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
       } else {
          // Source is taller than target (common for 3:4 -> 4:5): Crop height
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
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

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
    // SPECIAL HANDLING FOR 4:5
    // API does not support 4:5. Closest native is 3:4.
    // To prevent distortion, we feed the AI a 3:4 image (1080x1440).
    // Then we crop the result back to 4:5 (1080x1350).
    apiAspectRatio = "3:4";
    inputWidth = 1080;
    inputHeight = 1440; // 3:4 ratio to satisfy API native format
    finalWidth = 1080;
    finalHeight = 1350; // Requested 4:5 ratio
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
    // Step 1: Crop Input to API Friendly Size (prevents distortion)
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
    // Generation Fallback
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
      throw new Error("No content generated.");
    }

    for (const part of outputParts) {
      if (part.inlineData && part.inlineData.data) {
        const rawBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        const rawImageUrl = `data:${mimeType};base64,${rawBase64}`;

        // Step 2: Post-process Output to Exact User Dimensions
        // This handles the 3:4 -> 4:5 crop or ensures exact pixel dimensions for 1:1 and 9:16
        const finalImageUrl = await cropOutputToExactSize(rawImageUrl, finalWidth, finalHeight);
        
        return finalImageUrl;
      }
    }

    throw new Error("No image data found in the response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};