const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove single-line confirm returns
  content = content.replace(/^[ \t]*if\s*\(!window\.confirm\([^)]+\)\)\s*return;\r?\n/gm, '');
  content = content.replace(/^[ \t]*if\s*\(!confirm\([^)]+\)\)\s*return;\r?\n/gm, '');
  
  // 2. Remove block confirm checks (e.g. if (window.confirm(...)) { )
  // Replace: if (window.confirm("...")) { ... }
  // This is tricky with regex, so let's handle the specific ones we know:
  
  // In Messages.jsx
  content = content.replace(/if\s*\(window\.confirm\([^)]+\)\)\s*\{\s*([\s\S]*?)\s*\}/gm, '$1');

  // In EmployeeManagement.jsx and EmployeeAssignment.jsx and CourseManagement.jsx
  // if (!window.confirm(...)) { return; } -> just delete
  content = content.replace(/^[ \t]*if\s*\(!window\.confirm\([^)]+\)\)\s*\{\s*return;?\s*\}\r?\n/gm, '');
  
  // 3. Replace alert with toast.error
  content = content.replace(/alert\(/g, 'toast.error(');

  // If content changed, make sure toast is imported
  if (content !== original) {
    if (content.includes('toast.error') && !content.includes('react-hot-toast')) {
      content = content.replace(/import React/, "import { toast } from 'react-hot-toast';\nimport React");
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
