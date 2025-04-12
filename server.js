const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Track rooms and users
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join-room', (roomId) => {
    // Join the room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        canvasState: null
      });
    }
    
    const room = rooms.get(roomId);
    room.users.add(socket.id);
    
    // Send current user count to all in room
    io.to(roomId).emit('user-count', room.users.size);
    
    // Send existing canvas state to new user
    if (room.canvasState) {
      socket.emit('init-canvas', room.canvasState);
    }

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('drawing', (data) => {
    // Broadcast drawing to all other users in the room
    socket.to(data.room).emit('drawing', data.path);
    
    // Update room's canvas state
    const room = rooms.get(data.room);
    if (room) {
      room.canvasState = data.path;
    }
  });

  socket.on('clear-canvas', (roomId) => {
    // Broadcast clear to all users in room
    io.to(roomId).emit('clear-canvas');
    
    // Clear room's canvas state
    const room = rooms.get(roomId);
    if (room) {
      room.canvasState = null;
    }
  });

  socket.on('disconnect', () => {
    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        io.to(roomId).emit('user-count', room.users.size);
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
