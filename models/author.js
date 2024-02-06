const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  authorID: { type: String, required: true, unique: true },
  authorName: { type: String, required: true },
  birthdate: { type: Date },
  nationality: { type: String },
  role:
  {
    type:String,
    default:'author'
  }
});

module.exports=mongoose.model('Author', authorSchema)
