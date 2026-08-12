const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Seller = mongoose.model('Seller', new mongoose.Schema({ latitude: String, longitude: String }, { strict: false }));
  await Seller.updateMany({}, { $set: { latitude: '13.0827', longitude: '80.2707', address: 'Chennai, TN' } });
  console.log('Updated sellers!');
  process.exit(0);
});
