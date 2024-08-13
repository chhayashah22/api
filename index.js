import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import nodemailer from 'nodemailer';
import cloudinary from'cloudinary';
import User from './Models/User.model.js';
import Form from './Models/Form.model.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; 
import stripe from './Stripe.js';
import  'dotenv/config';
import {hashpassword,comparePassword} from './validation.js';

// ***********************************************Credentials*****************************************
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins 
methods:["GET","POST","PUT","DELETE"],
credentials: true
}));
// Handle preflight requests
app.options('*', cors());
app.use(express.urlencoded({extended:true}));
// SMTP Configuration for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user:process.env.USER,
    pass:process.env.PASS
       
    
  }
  
});
const URL=process.env.URL;
const SECRET_KEY=process.env.SECRET_KEY;


//******************************************middleware***************************************//


const verifyUser =async (req, res,next) => {  
  const token = req.headers.authorization;
  // console.log(token);
  if (!token) {
      return res.status(403).send({ message: 'No token provided' });
  }
  try {
      const decoded = jwt.verify(token, SECRET_KEY);       
      
      req.userId = decoded.id; // Use id from the token 
      console.log('User ID set:', req.userId); // Verify the assigned value
      next(); 
       } 
       catch (error) {    
      return res.status(401).send({ message: 'Unauthorized' });
  }
};


//  ****************************************************Connection*********************************************
mongoose.connect(URL)
    .then(() => console.log("connected to MongoDB"))
    .catch(error => console.log("Error connecting to MongoDB:", error));

  //  ************************************************LoGOUT******************************************************//


    app.post('/api/logout', (req, res) => {
      res.clearCookie('token'); // Clear the authentication cookie
      res.status(200).json({ message: 'Logged out successfully' });
    });
   
   
   
   
   //*******************************************Subsription*************************************************** */
   
    // Create customer
app.post('/api/create-customer', async (req, res) => {
  const { email } = req.body;
  try {
    const customer = await stripe.customers.create({ email });
    res.json({ customerId: customer.id });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Create subscription
app.post('/api/create-subscription', async (req, res) => {
  const { customerId, priceId, paymentMethodId } = req.body;

  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete', // Default behavior for incomplete payments
      expand: ['latest_invoice.payment_intent'],
      // Attach the payment method to the subscription
      default_payment_method: paymentMethodId,
    });

    const latestInvoice = subscription.latest_invoice;
    if (!latestInvoice || !latestInvoice.payment_intent) {
      console.error('Unable to retrieve payment intent:', latestInvoice);
      return res.status(500).send({ error: 'Unable to retrieve payment intent' });
    }
    const paymentIntent = latestInvoice.payment_intent;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).send({ error: error.message });
  }
});
//update
app.post('/api/update-subscription', async (req, res) => {
  const { userId, subscriptionStatus ,endDate,planstatus } = req.body;
  console.log(planstatus)
  console.log('Received data:', { userId, subscriptionStatus, endDate, planstatus });


  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    user.subscription.plan=planstatus;
    user.subscription.status = subscriptionStatus;
    user.subscription.endDate = endDate;
    await user.save();

    res.json({
      message: 'Subscription updated successfully',
      subscription: {
        plan: user.subscription.plan,
        status:user.subscription.status,
        endDate: user.subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).send({ error: error.message });
  }
});
app.get('/api/get-subscription',verifyUser, async (req, res) => {
  const  userId  = req.userId; // Get userId from request body

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.json({
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        endDate: user.subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).send({ error: error.message });
  }
});

//*************************************************Register CONTROLLER******************************** */


    
app.post('/api/form', async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).send({ message: "Email already registered" });
        }
            const hashedPassword = await hashpassword(password);
            const newUser = new User({
              name,
              email,
              password: hashedPassword,
              
            });
        
            
            await newUser.save();
        
         
        
       const token = jwt.sign({userId: newUser._id}, SECRET_KEY, { expiresIn: '5m' });   
        const mailOptions = {
            from: 'shahchhaya607@gmail.com',
            to: email,
            subject: 'Verification',
            html: `<html>
                <head>
                    <style>
                        /* Add your CSS styles here */
                        body {
                            font-family: Arial, sans-serif;
                        }
                        .container {
                            padding: 20px;
                            background-color: #f0f0f0;
                            border: 1px solid #ccc;
                            border-radius: 5px;
                        }
                        h2 {
                            color: #333;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Welcome, ${name}!</h2>
                        <a href="https://certificate-38z3.vercel.app/verify?token=${token}" target="_blank">Verify Email</a>
                        <P>Link will Expire in 5 min</p>
                        
                    </div>
                </body>
                </html>
            `
        };
        const result = await transporter.sendMail(mailOptions);        
        res.status(200).send({message:'Email sent successfully'});  
                 
    }
     catch (error) {
        res.status(400).send({ message: `Error registering user: ${error.message}` });
    }
});



// Email verification endpoint
app.get('/api/verify', async (req, res) => {
  const token = req.query.token; 
  if (!token) {
      return res.status(400).send({ message: 'Token is missing' });
  }
  
  try {
    const decode=jwt.decode(token);
    const decoded = jwt.verify(token, SECRET_KEY); 
    

      
      const user = await User.findById(decoded.userId);


      if (!user) {
          return res.status(400).send({ message: 'Invalid User ID' });
      }

      if (user.verified) {
      return res.send({message:"user verified"})
      }

      // Mark user as verified
      user.verified = true;
      await user.save();

      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Successful</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: green; }
                p { font-size: 1.2em; }
            </style>
        </head>
        <body>
            <h1>Email Verified Successfully</h1>
            <p>Your email has been successfully verified. You can now <a href="https://certificate-38z3.vercel.app/signin">sign in</a>.</p>
        </body>
        </html>`
    );
        
  } catch (error) {
      res.status(400).send({ message: `Error verifying email: ${error.message}` });
  }
});

//**************************************LOGIN CONTROLLER*************************************** */
app.post('/api/Sign', async (req, res) => {
  const { email, password } = req.body;
  console.log(email,password);
  try {
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ message: "Email not registered" });
    }
    
    const matching=await comparePassword(password,existingUser.password);
    if(!matching){
        return res.status(400).send({message:"invalid password"})
    }
    
    if (existingUser.password && existingUser.verified) {
      const token = jwt.sign({ id: existingUser._id, email: existingUser.email }, SECRET_KEY);
      

      return res.status(200).json({
        message: "success",
        token:token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          
        }
      });
    }
    if (!existingUser.verified) {
      return res.status(405).json({ message: "User not verified" });
    }  
    
  } catch (error) {
    
    return res.status(500).json({ message: "Internal server error",error });
  }
});


  //**********************************************Forgot password*******************************
  app.post('/api/resetPassword', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        
        const resetToken = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: "5m" });

        const resetUrl = `http://localhost:5173/Resetpassword/${user._id}/${resetToken}`;
        const mailOptions = {
            from: "shahchhaya607@gmail.com",
            to: email,
            subject: "Reset password",
            html: `<p>Click on the link to reset your password:</p>
                   <a href=${resetUrl}>${resetUrl}</a>
                   <p>Link will expire in 5 minutes</p>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                return res.status(500).send({ message: err.message });
            }
            res.status(200).send({ message: "Email sent" });
        });
    } catch (err) {
        res.status(500).send({ message: "Error" });
    }
});

app.get('/api/Resetpassword/:userId/:resetToken',async(req,res)=>{
    const {userId,resetToken}=req.params;
    res.send({userId,resetToken});
   
})


// *************************Update password*********************************//

app.post('/api/Updatepassword', async (req, res) => {
    const { resetToken, newPassword } = req.body;
  
    try {
      const decoded = jwt.verify(resetToken, SECRET_KEY);
      const userId = decoded.userId;
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).send('User not found.');
      }
  
      user.password = newPassword;
      await user.save();
  
      res.send("Password updated successfully!");
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).send('Error updating password. Please try again.');
    }
  });
  
  

  // **************************Form Data*************************//

  
 
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); 
    }
  });
  
  const upload = multer({ storage: storage });

  app.post('/api/submitform', verifyUser, upload.fields([{ name: 'file' }, { name: 'sign' }]), async (req, res) => {
    const { name, course, date, certificateUrl, signUrl } = req.body;
   
    const userId = req.userId;  // Get userId from the request
    
    try {
      
      const filter = { name, course, date }; 
      const updateData = {
        name,
        course,
        date,
        certificateUrl,
        signUrl,
        
        createdBy: userId // Update with the correct user ID
      };
  
      // Find existing entry and update, or create new one if not found
      const updatedEntry = await Form.findOneAndUpdate(filter, updateData, {
        new: true, // Return the updated document
        upsert: true // Create a new document if no match is found
      });
  
      console.log('Form data:', updatedEntry);
      res.status(200).json({ message: 'Form submitted successfully', updatedEntry });
    } catch (error) {
      console.error('Error saving form data:', error);
      res.status(400).json({ message: 'Error saving form data', error });
    }
  });


  app.post('/api/certificates/:id/generate', verifyUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { certificateId } = req.body;  
      const updatedCertificate = await Form.findByIdAndUpdate(
        id,
        { certificateId },
        { new: true }
      );
  
      if (!updatedCertificate) {
        return res.status(404).json({ message: 'Certificate not found' });
      }
  
      res.json({ updatedEntry: updatedCertificate });
    } catch (error) {
      console.error('Error updating certificate:', error); // Log the actual error
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  

  
    //fetchh certificates
  
    app.get('/api/certificates', verifyUser, async (req, res) => {
      const userId = req.userId;
      console.log(userId);
    
      try {
        const certificates = await Form.find({ createdBy: userId });
        const certificateDetails = certificates.map(certificate => ({
          id: certificate._id,
          name: certificate.name,
          date: certificate.date
        }));
    
        // Send the details as response
        return res.json({ certificates: certificateDetails });
      } catch (error) {
        console.error('Error in /certificates endpoint:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
      }
    });
    

    app.get('/api/certificates/:id', async (req, res) => {
      try {
        const certificate = await Form.findById(req.params.id);
        if (!certificate) {
          return res.status(404).json({ message: 'Certificate not found' });
        }
        res.json(certificate);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.put('/api/certificates/:id', async (req, res) => {
      try {
        const { name, course, date } = req.body;
        const { id } = req.params;
        // Find and update the certificate in your database
        const updatedCertificate = await Form.findByIdAndUpdate(id, { name, course, date }, { new: true });
        res.json(updatedCertificate);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update certificate' });
      }
    });
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
