const mongoose = require('mongoose');

const patronSchema = new mongoose.Schema({
  patronID: { type: String, required: true, unique: true },
  patronName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  membershipStatus: { type: String,enum:['Active','Not Active'],default:'Not Active' },
  role:
  {
    type:String,
    default:'patron'
  },
  password:String,
  confirmpassword:String,
  token:String,
  isverified:String
});

module.exports=mongoose.model('Patron', patronSchema)
