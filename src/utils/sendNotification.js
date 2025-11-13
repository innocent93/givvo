const Notification = require('../models/Notification');

const sendNotification = async ({
  io,
  message,
  userId,
  role = null,
  link = null,
}) => {
  const newNotif = await Notification.create({
    message,
    user: userId || undefined,
    role,
    link,
  });

  if (userId && io) {
    const socketId = Object.entries(io.sockets.sockets).find(
      ([id, socket]) => socket.userId === userId
    )?.[0];

    if (socketId) {
      io.to(socketId).emit('new_notification', newNotif);
    }
  }

  if (role && io) {
    io.emit('new_role_notification', { role, data: newNotif }); // Role-level broadcast — client must filter
  }

  return newNotif;
};

module.exports = sendNotification;
