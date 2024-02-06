const express = require('express');
const route = express.Router();
const Author = require('../models/author');
const Book = require('../models/book');
const authenticate=require('../middlewares/authenticate')
const transporter=nodemailer.createTransport(
  {
      service:'gmail',
      auth:
      {
          user:'yvishnuvamsith@gmail.com',
          pass:'mdpn lifx vbso swlp'
      }
  }
)
route.post('/register',async (req, res, next) => {
  const authorID = req.body.patronID
  const authorName = req.body.patronName
  const birthdate = req.body.email
  const password = req.body.password
  const confirmpassword = req.body.confirmpassword
  console.log(email)
  try {
    const existingUser = await patron.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if(password===confirmpassword){

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verificationToken = jwt.sign({ email }, 'your-secret-key', { expiresIn: '10m' });
    console.log(req.body)

    const newUser = new patron({
      email:email,
      password:hashedPassword,
      confirmpassword:hashedPassword,
      token:verificationToken,
      patronID:patronID,
      patronName:patronName,
    });

    // Save the user to the database
    
      await newUser.save()

    // Send verification email
    const verificationLink =` http://localhost:5000/patron/verify?token=${verificationToken}`;
    const mailOptions = {
      from: 'yvishnuvamsith@gmail.com',
      to: email,
      subject: 'Verify Your Email',
      text:` Click the following link to verify your email: ${verificationLink}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Registration successful. Check your email for verification.' });
  }
  // else
  // {
  //   res.status(404).json({message:"you are not authorized for this action"})
  // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }

});

route.get('/verify', async (req, res, next) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    const existingUser = await patron.findOne({ email: decoded.email, token: token });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found or invalid token' });
    }

    // Mark the user as verified
    existingUser.isverified = true;
    existingUser.token = undefined;
    await existingUser.save();
    const mailOptions = {
      from: 'yvishnuvamsith@gmail.com',
      to: decoded.email,
      subject: 'thank you',
      text: 'welcome',
    };

    await transporter.sendMail(mailOptions)
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


route.post('/reset',authenticate,async(req,res,next)=>
{
let role=req.user.role
if(role==='user'){
  const{email,password,newpassword}=req.body
  let User
  try{
      User=await patron.findOne({email:email})
      if(User)
      {
          const currentpassword=User.password
          if(password===currentpassword)
          {
              User.password=newpassword
              res.status(200).json({message:"password updated"})
              User.save()
          }
          else
          {
              res.status(404).json({message:"password don't match"})
          }
      }
  }
  catch(err)
  {
      console.log(err)
  }
}
  

})