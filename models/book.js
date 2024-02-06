const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  ISBN: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  genre: { type: String },
  patron: { type: mongoose.Schema.Types.ObjectId, ref: 'Patron' },
  availabilityStatus: { type: String,enum:['available','not available'],default:'available' },
  checkoutDate: { type: Date },
  
});

module.exports=mongoose.model('Book', bookSchema)
