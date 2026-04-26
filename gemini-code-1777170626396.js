const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
    // Criar Sala
    socket.on('createRoom', ({ roomName, duration }) => {
        const roomCode = Math.floor(10000 + Math.random() * 90000).toString();
        rooms[roomCode] = {
            name: roomName,
            duration: parseInt(duration) * 60, // converte minutos para segundos
            players: {},
            active: true
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        
        // Timer da Sala
        const timer = setInterval(() => {
            if (rooms[roomCode].duration <= 0) {
                rooms[roomCode].active = false;
                io.to(roomCode).emit('gameOver', rooms[roomCode].players);
                clearInterval(timer);
            } else {
                rooms[roomCode].duration--;
                io.to(roomCode).emit('timerUpdate', rooms[roomCode].duration);
            }
        }, 1000);
    });

    // Entrar na Sala
    socket.on('joinRoom', (code) => {
        if (rooms[code] && rooms[code].active) {
            socket.join(code);
            rooms[code].players[socket.id] = { points: 0, id: socket.id };
            socket.emit('joinedSuccess', code);
            io.to(code).emit('updateLeaderboard', rooms[code].players);
        } else {
            socket.emit('error', 'Sala não encontrada ou encerrada.');
        }
    });

    // Enviar Foto / Ganhar Pontos
    socket.on('sendPhoto', (code) => {
        if (rooms[code] && rooms[code].active) {
            rooms[code].players[socket.id].points += 200;
            io.to(code).emit('updateLeaderboard', rooms[code].players);
        }
    });
});

server.listen(3000, () => console.log('Arena rodando na porta 3000'));