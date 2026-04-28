import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAI() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export function safeJsonParse(jsonStr: string) {
  let text = jsonStr.trim();
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }
  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON parse failed, attempting heuristic repair:", e);
    
    // Quick heuristic for truncated JSON from LLMs
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    
    let lastValid = Math.max(lastBrace, lastBracket);
    if (lastValid > -1) {
      // Try closing array/object combinations
      const endings = ['', '}', ']', ']}', '}]', '}]}', ']}]', '"}', '"]}', '"}', '"]'];
      
      for (const end of endings) {
        try {
          return JSON.parse(text.substring(0, lastValid + 1) + end);
        } catch (err) {}
      }
    }
    
    // Fallback if we really can't repair it
    try {
        // Find the last complete block or key
        const safeCut = text.substring(0, text.lastIndexOf(','));
        const endings = ['}', ']', ']}', '}]'];
        for (const end of endings) {
            try { return JSON.parse(safeCut + end); } catch(err) {} 
        }
    } catch (fallbackErr) {}

    // Ultimate fallback returning empty structure that matches most expectations
    return { blocks: [], schema: [], error: true };
  }
}

export async function askGemini(systemInstruction: string, prompt: string, includeSchema = false, history: { role: 'user' | 'model', text: string }[] = []) {
  const ai = getAI();
  const config: any = { systemInstruction };
  
  if (includeSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = {
       type: Type.OBJECT,
       properties: {
          action: { type: Type.STRING, description: "'replace' or 'append'" },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, description: "'h1', 'h2', 'p', 'todo', 'list'" },
                text: { type: Type.STRING }
              }
            }
          }
       }
    };
  }

  const contents = [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents,
    config
  });

  return response.text;
}

export async function askGeminiForDatabaseSchema(prompt: string) {
  const ai = getAI();
  const config: any = {
    responseMimeType: "application/json",
  };

  const jsonSchemaInstruction = `
You must return a valid JSON object with the following structure:
{
  "title": "String",
  "schema": [
    {
      "key": "camelCaseString",
      "name": "Human Readable Name",
      "type": "text | select | date | status | number | checkbox | formula | relation",
      "options": ["Option 1", "Option 2"] // Only for select/status
    }
  ],
  "initialTasks": [
    {
      "title": "Main title of record",
      "properties": {
        "columnKey": "value",
        "anotherColumn": "value"
      }
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `Task: ${prompt}\n\n${jsonSchemaInstruction}\n\nPlease generate a comprehensive and diverse database schema. \n- Use varied column types. Suggest more advanced column types like 'formula' or 'relation' if applicable to the topic, along with standard ones ('text', 'select', 'date', 'status', 'number', 'checkbox'). \n- Generate 10-15 high-quality, realistic initial records that make robust use of the schema columns.\n- Ensure accurate and varied realistic records, including YYYY-MM-DD dates within the next 30 days relative to today, more complex nested property structures for some records, perfectly matching select/status options, and vivid descriptions.`,
    config
  });

  return response.text;
}
