import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Let's first query the current unread notifications from DB
  const mongoose = await import('mongoose');
  const { Notification } = await import('./server/models/Notification.js');
  await mongoose.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  
  const notif = await Notification.findOne({ isRead: false });
  if (!notif) {
    console.log('No unread notifications in DB to test.');
    process.exit(0);
  }
  
  const notifId = notif._id.toString();
  console.log('Found unread notif ID in DB:', notifId);
  
  // Now let's call the API running on localhost:3000 to mark it as read
  const url = 'http://localhost:3000/api/notifications/mark-read';
  console.log('Sending POST to:', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId: notifId })
  });
  
  console.log('Response status:', response.status);
  const responseData = await response.json();
  console.log('Response body:', responseData);
  
  // Let's verify in the DB if it is now read
  const verified = await Notification.findById(notifId);
  console.log('Verified isRead in DB:', verified?.isRead);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
