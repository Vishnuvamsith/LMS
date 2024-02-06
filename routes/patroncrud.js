const express=require('express')
const route=express.Router()
const pdfkit = require('pdfkit');
const patron=require('../models/patron')
const book=require('../models/book')
const bcrypt=require('bcrypt')
const jwt = require('jsonwebtoken');
const nodemailer=require('nodemailer')
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
    const patronID = req.body.patronID
    const patronName = req.body.patronName
    const email = req.body.email
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
route.post('/checkoutBook', authenticate, async (req, res) => {
  try {
    //const patronID = req.body.patronID;
    const ISBN = req.body.ISBN;
    const user=req.user
    // Find the patron
    // const patron = await patron.findOne({ patronID: patronID });
    // if (!patron) {
    //   return res.status(404).json({ message: 'Patron not found.' });
    // }

    // Check if the patron is active
    if (user.membershipStatus !== 'Active') {
      return res.status(403).json({ message: 'Patron is not an active member. Cannot check out books.' });
    }

    // Find the book
    let Book
    console.log(ISBN)
    Book = await book.findOne({ ISBN: ISBN });
    if (!Book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    // Check if the book is available
    if (Book.availabilityStatus !== 'available') {
      return res.status(400).json({ message: 'Book is not available for checkout.' });
    }

    // Update the availability status of the book to 'not available'
    Book.availabilityStatus = 'not available';
    Book.checkoutDate = new Date(); // Assuming you want to save the current date as the checkout date
    //await book.save();
    Book.patron=req.user._id

    await Book.save();

    res.status(200).json({ message: 'Book checked out successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
route.post('/returnBook', authenticate, async (req, res) => {
  try {
    //const patronID = req.body.patronID;
    const ISBN = req.body.ISBN;
    const user=req.user

    // Find the patron
    
    if (user.membershipStatus !== 'Active') {
      return res.status(403).json({ message: 'Patron is not an active member. Cannot return books.' });
    }

    // Find the book
    const Book = await book.findOne({ ISBN: ISBN });
    if (!Book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    // Check if the book is checked out by the patron
    if (Book.availabilityStatus !== 'not available') {
      return res.status(400).json({ message: 'Book is not checked out by the patron.' });
    }

    // Update the availability status of the book to 'available'
    Book.availabilityStatus = 'available';
    await Book.save();

    // Calculate overdue charges (you may need to implement this based on your business logic)
    const overdueCharges = calculateOverdueCharges(Book.checkoutDate, new Date());

    res.status(200).json({ message: 'Book returned successfully.', overdueCharges: overdueCharges });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// route.get('/overdueReportsPdf', authenticate, async (req, res) => {
//   try {
//     // Check if the logged-in user is an admin
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Unauthorized. Only admins can generate overdue reports.' });
//     }

//     // Find books that are overdue
//     const overdueBooks = await Book.find({ availabilityStatus: 'not available', returnDate: { $lt: new Date() } })
//       .populate('patron', 'patronID patronName email')
//       .populate('author', 'name');

//     // Create a PDF document
//     const doc = new pdfkit();
//     const pdfPath = './overdueReports.pdf';
//     const writeStream = fs.createWriteStream(pdfPath);

//     // Header of the PDF
//     doc.fontSize(16).text('Overdue Reports', { align: 'center' }).moveDown();

//     // Iterate through overdue books and add information to the PDF
//     overdueBooks.forEach(book => {
//       doc.fontSize(14).text(`Patron: ${book.patron.patronName} (${book.patron.patronID})`, { continued: true });
//       doc.fontSize(12).text(`Email: ${book.patron.email}`);
//       doc.fontSize(12).text(`Book: ${book.title} (ISBN: ${book.ISBN})`);
//       doc.fontSize(12).text(`Author: ${book.author.name}`);
//       doc.fontSize(12).text(`Checkout Date: ${book.checkoutDate}`);
//       doc.fontSize(12).text(`Return Date: ${book.returnDate}`);
//       doc.fontSize(12).text(`Overdue Charge: $${calculateOverdueCharge(book.returnDate)}`, { underline: true }).moveDown();
//     });

//     // Save and send the PDF
//     doc.pipe(writeStream);
//     doc.end();
//     writeStream.on('finish', () => {
//       res.download(pdfPath, 'overdueReports.pdf', () => {
//         fs.unlinkSync(pdfPath); // Remove the temporary PDF file after download
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// Function to calculate overdue charges (you may need to implement this based on your business logic)
function calculateOverdueCharges(checkoutDate, returnDate) {
  // Example: Calculate overdue charges based on the number of days overdue
  const dueDate = new Date(checkoutDate);
  dueDate.setDate(dueDate.getDate()); // Assuming a 14-day checkout period

  const daysOverdue = Math.max(0, returnDate - dueDate) / (1000 * 60 * 60 * 24);
  const overdueCharges = daysOverdue * 2; // Assuming a charge of $2 per day overdue

  return overdueCharges;
}
module.exports=route