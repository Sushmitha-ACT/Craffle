const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/craffle');
  console.log('Connected to MongoDB');

  const dbPath = path.join(__dirname, 'server', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.log('db.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // Import models dynamically using dynamic import for ES modules since the models are .ts but we can compile them or use tsx
  // Wait, the models are TypeScript files. I cannot require them directly in a CommonJS script without compiling them.
  // I will write a small ES module script and run it with `tsx`.
}

seed();
