const express=require('express')
const router=express.Router()
const author=require('../models/author')
const patron=require('../models/patron')
const admin=require('../models/admin')
const bcrypt=require('bcrypt')
const jwt = require('jsonwebtoken');
router.post('/login', async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    const role = req.body.role
    console.log(password,email,role)
  
    try {
    let existingUser
      if(role==='author'){
      existingUser = await author.findOne({ email:email });
      }
      else if(role=='patron')
      {
        existingUser = await patron.findOne({ email:email });
      }
      else
      {
        existingUser = await admin.findOne({ email:email });
      }
      //console.log()
      //boolean temp= bcrypt.compare(password, existingUser.password)
  
      if (!existingUser||!await bcrypt.compare(password,existingUser.password)) {
        return res.status(401).json({ success:false,message: 'Invalid email or password' });
      }
  
      // Generate a JWT token
      const token = jwt.sign({email}, 'your-secret-key', { expiresIn: '1h' });
      existingUser.token=token
      await existingUser.save()
      res.status(200).json({ role:role,token,success:true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success:false,message: 'Internal Server Error' });
    }
  });
  module.exports=router