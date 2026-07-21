const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("import { toast } from 'react-hot-toast', {")) {
    content = content.replace("import { toast } from 'react-hot-toast', {", "import { toast } from 'react-hot-toast';\nimport {");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
