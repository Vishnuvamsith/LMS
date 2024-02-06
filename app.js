const express = require('express');
const mongoose = require('mongoose');

const login=require('./middlewares/login')
const patron=require('./routes/patroncrud')
const admin=require('./routes/admincrud')
const app = express();
const PORT = 5000
app.use(express.json())

mongoose.connect('mongodb+srv://root:root@it3fsd.6cqlrhg.mongodb.net/lms?retryWrites=true&w=majority')
.then(()=>
{
  console.log("succesfully connected to db")
})
.catch((err)=>
{
  console.log(err)
})
app.use('/login',login)
app.use('/patron',patron)
app.use('/admin',admin)
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });