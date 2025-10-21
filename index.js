import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { Server } from 'socket.io';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const gpiod = require('node-gpiod');

const gpio = new gpiod('/dev/gpiochip0');
var relais, input18;

// Initialize GPIO asynchronously
await gpio.open();

// Request output mode for GPIO 17 (relay)
relais = await gpio.request_mode(17, gpiod.OUTPUT_MODE, 0, "relay");

// Request event for GPIO 18 (input with edge detection)
input18 = await gpio.request_event(18, gpiod.INPUT_MODE, gpiod.BOTH_EDGE, "input18");
console.log('watch input 18');

// Attach event handler for input18
gpio.attach_event(input18, (err, event) => {
  if (err) return console.error(err);
  console.log(`input18 changed to ${event.id === gpiod.EVENT_FALLING ? "FALLING" : "RISING"}`);
});

// Periodic status check
setInterval(async () => {
  try {
    const value = await gpio.get_values(relais);
    console.log(`relais is ${value}`);
  } catch (err) {
    console.error(err);
  }
}, 5000);

console.log(relais);
const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./public/index.html'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.resolve('./public/script.js'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect',()=> {
    console.log('a user is disconnected')
  });
  socket.on('toggle', async (msg) =>
  {
    try {
      const currentValue = await gpio.get_values(relais);
      if (currentValue === 0) { //check the pin state, if the state is 0 (or off)
        await gpio.set_values(relais, 1);
        console.log('set pin state to 1 (turn LED on)');
      } else {
        await gpio.set_values(relais, 0);
        console.log('set pin state to 0 (turn LED off)');
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  });
  socket.on('chat message', (msg) => 
  {
    console.log(`message is ${msg}`);
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});