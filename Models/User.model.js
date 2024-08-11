import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },

    email: {
        type:String,
        required:true,
        
    },
        password:{
        type: String,
        required:true,
        
         },
         verified:{
            type:Boolean,
            default:false
         },
         subscription:{
         plan: {
            type: String,
            enum: ['Free', 'Base', 'Pro'],
            default: 'Free'
          },
          status:{
            type:String,
            enum:['Active','Inactive'],
            default:'Inactive'
          },
          startdate:{
            type: Date,
        },
        endDate: {
          type: Date,
        },
         }
  
          
         
          
});
const User = mongoose.model('User', userSchema);
export default User;