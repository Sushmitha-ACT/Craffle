const mongoose = require('mongoose');
const { Seller } = require('../backend/models/Seller.js');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sellers = await Seller.find();
  console.log(sellers.map(s => ({
    name: s.businessName,
    address: s.address,
    lat: s.latitude,
    lng: s.longitude
  })));
  process.exit();
}
check();
