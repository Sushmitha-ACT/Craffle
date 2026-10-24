const fetch = require('node-fetch');
async function test() {
  const q = 'lakshmi puram street, chennai, tamilnadu - 600026';
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'CraffleApp/1.0' }
  });
  const data = await res.json();
  console.log(data);
}
test();
