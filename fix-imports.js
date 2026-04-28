import fs from 'fs';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/from\s+['"]\.\.\/components\/ui\/(.*)['"]/g, 'from "@/components/ui/$1"');
  content = content.replace(/from\s+['"]\.\/ui\/(.*)['"]/g, 'from "@/components/ui/$1"');
  fs.writeFileSync(filePath, content);
}

replaceInFile('src/pages/PageView.tsx');
replaceInFile('src/pages/DatabaseView.tsx');
replaceInFile('src/components/Sidebar.tsx');

console.log("Replaced imports to use alias");
