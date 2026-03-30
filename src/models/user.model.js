import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"; //to generate access token and refresh token    
import bcrypt from "bcrypt"; //to hash the password

const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true //to make field searchable
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true //to make field searchable
        },
        avatar:{
            type:String, //url milega cloudinary ka url use krenge
            required:true
        },
        coverImage:{
            type:String,
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ] ,
        password:{
            type:String,
            required:[true,"Password is required"],
        },
        refreshToken:{
            type:String
        }

    }, 
    { timestamps: true }
);

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) {
        return next();
    }//only hash the password if it is modified or new
    this.password= bcrypt.hash(this.password,10) //10 is the salt rounds
    next();
}) //idhar no arrow function nhi as it does not know context
//and here context is important this is implemented just before saving

userSchema.methods.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password,this.password) //this.password is the hashed password stored in db  
}

userSchema.methods.generateAccessToken= function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken= function(){

    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )

}
export const User = mongoose.model("User", userSchema);
