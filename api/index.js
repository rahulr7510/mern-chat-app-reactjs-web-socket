const express = require('express')
const mongoose = require('mongoose')
const User = require('./models/User')
const Message = require('./models/Message')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const ws = require('ws')
require('dotenv').config()
const app = express()

const PORT = process.env.PORT || 4200

// middlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    credentials:true,
     origin: process.env.CLIENT_URL,
    }))
// connecting to database
mongoose.connect(process.env.MONGO_URL)
const jwtSecret = process.env.JWT_SECRET
const bcryptSalt = bcrypt.genSaltSync(13)

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token
        if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            resolve(userData)
        });
    } else {
        reject('no token')
    }
    });
}

// endpoints

app.get('/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender:{$in:[userId, ourUserId]},
        recipient: {$in:[userId, ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
})

app.get('/people', async (req, res) => {
  const users = await User.find({}, {'_id':1, username:1})
  res.json(users)
})

app.get('/profile', (req, res) => {
    const token = req.cookies?.token
    if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData)
    })
} else {
    res.status(401).json("token error")
}
})

app.post('/register', async (req, res) => {
    const {username, password} = req.body ;
    try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
    const createdUser = await User.create({username: username, password: hashedPassword})
   jwt.sign({userId: createdUser._id, username}, jwtSecret, {}, (err, token) => {
    if (err) throw err;
    res.cookie('token', token).status(201).json({
        id: createdUser._id,
    })
   })
   } catch(err) {
    if (err) throw err;
    res.status(500).json('error')
   }

})

app.post('/login', async (req, res) => {
    const {username, password} = req.body
   const foundUser = await User.findOne({username})
   if (foundUser) {
  const passOk = bcrypt.compareSync(password, foundUser.password)
  if (passOk) {
    jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => {
        res.cookie('token', token).json({id: foundUser._id});
    })
  }
   }
})

app.post('/logout', (req, res) => {
    res.cookie('token', "").json('ok');
});


const server = app.listen(PORT, () => console.log(`server is connected to port ${PORT}`))
// web-socket connection
const wss = new ws.WebSocketServer({server})

wss.on('connection', (connection, req) => {

    // function to notify everyone about online people (when someon new connects)
       function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online:[...wss.clients].map(c => ({userId:c.userId, username:c.username})),
            }))
        })
       }
    // for killing inactive connection and updating online/offline status
       connection.isAlive = true;
       connection.timer = setInterval(() => {
       connection.ping();
       connection.deathTimer = setTimeout(() => {
       connection.isAlive = false;
       clearInterval(connection.timer);
       connection.terminate();
       notifyAboutOnlinePeople();
        }, 1000);
    }, 5000);

    connection.on('pong', () => {
        clearTimeout(connection.deathTimer);
    })
    // read username and id from the cookie for connection
    const cookies = req.headers.cookie
    if (cookies) {
    const tokenCookieString = cookies.split(';').find(string => string.startsWith('token='))
    if (tokenCookieString) {
        const token = tokenCookieString.split('=')[1]
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if (err) throw err ;
                const {userId, username} = userData;
                connection.userId = userId;
                connection.username = username;
            })
        }
    }
    };
    // sending messages between users
    connection.on('message', async (message) => {
       const messageData = JSON.parse(message.toString());
        const {recipient, text} = messageData
        if (recipient && text) {
         const messageDoc =  await Message.create({
                sender: connection.userId,
                recipient,
                text,
            });
            [...wss.clients].filter(c => c.userId === recipient).forEach(c => c.send(JSON.stringify({
                 text,
                 sender:connection.userId,
                 recipient,
                 _id: messageDoc._id,
                })));
        }
    });

    // notify everyone about online people (when someon new connects)
    notifyAboutOnlinePeople();
});
