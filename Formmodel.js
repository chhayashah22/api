// app.js

import mongoose from 'mongoose';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();


// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
const URL='mongodb://localhost:27017/auth/Form';
mongoose.connect(URL)
  .then(() => console.log('connected to MongoDB'))
  .catch(error => console.log('Error connecting to MongoDB:', error));

// Schema and Model
const formSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  certificateId:{
    type:String,
    unique:true
  }
  
});

const Form = mongoose.model('Form', formSchema);



export default Form;
