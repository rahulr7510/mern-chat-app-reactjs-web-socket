const mongoose = require('mongoose')

const UserSchema =  new mongoose.Schema({
    username: {type:String, min:3, required:true, unique:true},
    password: {type:String, max:20,  required:true},
}, {timestamps:true})

 const UserModel = mongoose.model('User', UserSchema)

 module.exports = UserModel;