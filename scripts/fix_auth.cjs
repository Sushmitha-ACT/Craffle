const fs = require('fs');
const path = require('path');

let content = fs.readFileSync(path.join('server', 'routes', 'auth.routes.ts'), 'utf8');

// 1. Add User model import
if (!content.includes("import { User } from '../models/User.js';")) {
  content = content.replace("import { loadDB", "import { User } from '../models/User.js';\nimport { loadDB");
}

// 2. Fix getUsers() -> await User.find() or similar, but simpler:
// Since auth.routes.ts is specifically what we are refactoring:
content = content.replace(/const users = getUsers\(\);\s*const existingUser = users\.find\(u => u\.email\.toLowerCase\(\) === email\.toLowerCase\(\)\);/g, 
  "const existingUser = await User.findOne({ email: email.toLowerCase() });");
content = content.replace(/router\.post\('\/api\/auth\/register', \(req, res\) => {/g, 
  "router.post('/api/auth/register', async (req, res) => {");
content = content.replace(/users\.push\(newUser\);/g, "await User.create(newUser);");
content = content.replace(/const newUser: User = {/g, "const newUser = {");

// fix verify-otp
content = content.replace(/router\.post\('\/api\/auth\/verify-otp', \(req, res\) => {/g, 
  "router.post('/api/auth/verify-otp', async (req, res) => {");
content = content.replace(/const users = getUsers\(\);\s*const user = users\.find\(u => u\.email\.toLowerCase\(\) === email\.toLowerCase\(\)\);/g, 
  "const user = await User.findOne({ email: email.toLowerCase() });");
content = content.replace(/user\.isVerified = true;/g, "user.isVerified = true; await user.save();");

// resend-otp
content = content.replace(/router\.post\('\/api\/auth\/resend-otp', \(req, res\) => {/g, 
  "router.post('/api/auth/resend-otp', async (req, res) => {");

// fix forgot password
content = content.replace(/router\.post\('\/api\/auth\/forgot-password', \(req, res\) => {/g, 
  "router.post('/api/auth/forgot-password', async (req, res) => {");
content = content.replace(/const users = getUsers\(\);\s*const user = users\.find\(u => u\.email\.toLowerCase\(\) === email\.toLowerCase\(\)\);/g, 
  "const user = await User.findOne({ email: email.toLowerCase() });");

// reset-password
content = content.replace(/router\.post\('\/api\/auth\/reset-password', \(req, res\) => {/g, 
  "router.post('/api/auth/reset-password', async (req, res) => {");
content = content.replace(/user\.password = hashedPassword;/g, "user.password = hashedPassword; await user.save();");

// fix PENDING and REJECTED status which don't exist in the enum anymore
content = content.replace(/VerificationStatus\.PENDING/g, "VerificationStatus.VERIFYING");
content = content.replace(/VerificationStatus\.REJECTED/g, "VerificationStatus.FAILED");
content = content.replace(/VerificationStatus\.APPROVED/g, "VerificationStatus.VERIFIED");

// fix createNotification (4 args to 5 args)
content = content.replace(/createNotification\(([^,]+),([^,]+),([^,]+),([^)]+)\)/g, "createNotification($1, $2, $3, $4, '')");

fs.writeFileSync(path.join('server', 'routes', 'auth.routes.ts'), content);
console.log('auth.routes.ts updated');
