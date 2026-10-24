import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/sellers/profile/66b8764a8549646b1eb96c94', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test',
        address: 'Test Address',
        phone: '1234567890',
        category: 'Homemade Products',
        description: 'Test',
        latitude: '13.0827',
        longitude: '80.2707'
      })
    });
    
    console.log("Status:", res.status);
    console.log("Headers:", res.headers.raw());
    
    const text = await res.text();
    console.log("Response text:", text.substring(0, 500));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
