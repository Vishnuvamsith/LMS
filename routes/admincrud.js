const express=require('express')
const route=express.Router()
const author=require('../models/author')
const admin=require('../models/admin')
const patron = require('../models/patron')
const Book=require('../models/book')
const nodemailer=require('nodemailer')
const jwt = require('jsonwebtoken');
const bcrypt=require('bcrypt')
const authenticate=require('../middlewares/authenticate')
const PDFDocument = require('pdfkit');
const fs = require('fs');

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
route.post('/register', async (req, res, next) => {
    const { Name, email, password, confirmpassword} = req.body;

    try {
        const existingUser = await admin.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const verificationToken = jwt.sign({ email }, 'your-secret-key', { expiresIn: '10m' });
        console.log(req.body)

        if (password === confirmpassword) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new admin({
                Name:Name,
                email:email,
                token:verificationToken,
                password: hashedPassword,
                confirmpassword: hashedPassword
            });
            await newUser.save();
            const verificationLink = `http://localhost:5000/admin/verify?token=${verificationToken}`;
      const mailOptions = {
        from: 'yvishnuvamsith@gmail.com',
        to: email,
        subject: 'Verify Your Email',
        text: `Click the following link to verify your email: ${verificationLink}`,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.status(201).json({ message: 'Registration successful. Check your email for verification.' });
        } else {
            res.status(400).json({ message: 'Password and confirm password do not match' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
route.get('/verify', async (req, res, next) => {
    const { token } = req.query;
  
    try {
      const decoded = jwt.verify(token, 'your-secret-key');
      const existingUser = await admin.findOne({ email: decoded.email, token: token });
  
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found or invalid token' });
      }
      existingUser.isverified = true;
      existingUser.token = undefined;
      await existingUser.save();
      const mailOptions = {
        from: 'yvishnuvamsith@gmail.com',
        to: decoded.email,
        subject: 'thank you',
        text: 'welcome',
      };
  
      await transporter.sendMail(mailOptions);
    
      res.status(200).json({ message: 'Email verified successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  route.post('/add-author',authenticate,async (req, res,next) => {
    console.log(req.user.role)
    if(req.user.role!=='admin')
    {
      console.log(req.user.role)
      return res.status(404).json({message:"unauthorized access"})
    }
    try {
      const { authorID, authorName, birthdate, nationality } = req.body;
      const newAuthor = new author({
        authorID,
        authorName,
        birthdate,
        nationality,
      });
      const savedAuthor = await newAuthor.save();
  
      res.status(201).json(savedAuthor);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  route.get('/authors', authenticate,async (req, res) => {
    if(req.user.role!=='admin')
    {
      return res.status(404).json({message:"unauthorized access"})
    }
    try {
      const authors = await author.find(); 
      res.status(200).json(authors);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  route.post('/addBook', authenticate, async (req, res) => {
    let Author
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Only admin can add books.' });
      }
  
      const { ISBN, title, authorName, genre, availabilityStatus } = req.body;
      if (!ISBN || !title || !authorName) {
        return res.status(400).json({ message: 'ISBN, title, and authorName are required fields.' });
      }
      Author = await author.findOne({ authorName: authorName });
      if (!Author) {
        return res.status(404).json({ message: 'Author not found.' });
      }
      const newBook = new Book({
        ISBN: ISBN,
        title: title,
        author: Author._id, // Use the author's ObjectId
        genre: genre,
        availabilityStatus: availabilityStatus || 'available',
      });
  
      const savedBook = await newBook.save();
  
      res.status(201).json(savedBook);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  route.delete('/deletePatron/:patronID', authenticate, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Only admin can delete patrons.' });
      }
  
      const patronID = req.params.patronID;
      const existingPatron = await patron.findOne({ patronID: patronID });
      if (!existingPatron) {
        return res.status(404).json({ message: 'Patron not found.' });
      }
      await existingPatron.remove();
  
      res.status(200).json({ message: 'Patron deleted successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  route.get('/viewPatron/:patronID', authenticate, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized. Only admins can view patron information.' });
      }
  
      const patronID = req.params.patronID;
      const Patron = await patron.findOne({ patronID: patronID });
  
      if (!Patron) {
        return res.status(404).json({ message: 'Patron not found.' });
      }
      const checkedOutBooks = await Book.find({ patron: Patron._id });
      const patronInfo = {
        patronID: Patron.patronID,
        patronName: Patron.patronName,
        email: Patron.email,
        membershipStatus: Patron.membershipStatus,
        checkedOutBooks: checkedOutBooks.map(book => ({
          ISBN: book.ISBN,
          title: book.title,
          checkoutDate: book.checkoutDate,
        })),
      };
  
      res.status(200).json(patronInfo);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
route.post('/status/:patronName',authenticate,async(req,res,next)=>
{
  if(req.user.role!=='admin')
  {
    return res.status(403).json({ message: 'Unauthorized. Only admins can view patron information.' });
  }
  try
  {
    let user=req.params.patronName
    let temp
    temp=await patron.findOne({patronName:user})
    if(temp)
    {
      temp.membershipStatus='Active'
      await temp.save()
      res.status(200).json({message:"status updated"})
    }
    else
    {
      res.status(404).json({message:"patron doesnt exist"})
    }
  }
  catch(err)
  {
    console.log(err)
  }
})
route.get('/overdueReportsPdf', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Only admins can generate overdue reports.' });
    }
    const overdueBooks = await Book.find({ availabilityStatus: 'not available'})
      .populate('patron')
      .populate('author');
      console.log(overdueBooks)
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="overdueReports.pdf"');
    doc.pipe(res);
    doc.fontSize(16).text('Overdue Reports', { align: 'center' }).moveDown();
    overdueBooks.forEach(book => {
      doc.fontSize(12).text(`Patron: ${book.patron.patronName} (${book.patron.patronID})`);
      doc.fontSize(12).text(`Email: ${book.patron.email}`);
      doc.fontSize(12).text(`Book: ${book.title} (ISBN: ${book.ISBN})`);
      doc.fontSize(12).text(`Author: ${book.author.name}`);
      doc.fontSize(12).text(`Checkout Date: ${book.checkoutDate}`);
      doc.fontSize(12).text(`Return Date: Haven't returned yet`);
      doc.fontSize(12).text(`Overdue Charge: $${calculateOverdueCharges(book.checkoutDate,  new Date())}`, { underline: true }).moveDown();
    });

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



function calculateOverdueCharges(checkoutDate, returnDate) {
  const dueDate = new Date(checkoutDate);
  dueDate.setDate(dueDate.getDate());

  const daysOverdue = Math.max(0, returnDate - dueDate) / (1000 * 60 * 60 * 24);
  const overdueCharges = daysOverdue * 2; 

  return overdueCharges.toFixed(2);
}
  

module.exports=route