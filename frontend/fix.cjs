const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.includes("import { toast } from 'react-hot-toast', {")) {
    content = content.replace("import React from 'react';\nimport { toast } from 'react-hot-toast', {", "import React, {");
    content = content.replace("import React, {", "import React, {\nimport { toast } from 'react-hot-toast';\n//");
    // wait that's bad. Let's do it better.
  }

  // Better regex for the specific problem:
  // We replaced "import React" with "import React from 'react';\nimport { toast } from 'react-hot-toast'"
  // So "import React, { useState }" became "import React from 'react';\nimport { toast } from 'react-hot-toast', { useState }"
  
  const regex = /import React from 'react';\r?\nimport \{ toast \} from 'react-hot-toast'(, \{[^}]+\} from 'react';)/g;
  if (regex.test(content)) {
    content = content.replace(regex, "import React$1\nimport { toast } from 'react-hot-toast';");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
