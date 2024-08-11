import mongoose from "mongoose";
import { Schema } from "mongoose";
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
      certificateUrl:{
        type:String,
      },
      signUrl:{
        type:String,
      },
      createdBy:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
      },
      certificateId:{
        type:String
      }

   
    });
  const Form = mongoose.model('Form', formSchema);
  export default Form;
 
  
    
  