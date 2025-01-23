const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

// use ejs template for rendering
app.set('view engine', 'ejs')
// serves static files from public directory
app.use(express.static('public'))

// render initial page
app.get('/', (req, res) => {
  res.render('home')
})
// Defining roots
// tells user to join a new room when button is pressed
app.get('/join', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

// /:room route renders a view named room.ejs passing roomid ad a param
app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

// Initialize server websocket - when client connects via websocket the server listens for events

io.on('connection', socket => {
  // when a join-room event is recieved server emits user-connect event
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    // client disconnection
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

// start server on port3000 and listen
server.listen(3000)