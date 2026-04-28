import fs from 'fs';

let content = fs.readFileSync('src/lib/ai.ts', 'utf-8');
const targetFunc = `export function safeJsonParse(jsonStr: string) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("JSON parse failed, attempting heuristic repair:", e);`;

const replacement = `export function safeJsonParse(jsonStr: string) {
  let text = jsonStr.trim();
  if (text.startsWith('\`\`\`json')) {
    text = text.substring(7);
  } else if (text.startsWith('\`\`\`')) {
    text = text.substring(3);
  }
  if (text.endsWith('\`\`\`')) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON parse failed, attempting heuristic repair:", e);`;

content = content.replace(targetFunc, replacement);
fs.writeFileSync('src/lib/ai.ts', content);
