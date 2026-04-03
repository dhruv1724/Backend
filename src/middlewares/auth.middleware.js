//this will verify if user is there or not
import asyncHandler from  '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
export const verifyUser= asyncHandler(async(req,_,next)=>{ 
    try {
        const accessToken=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
        if(!accessToken){
            throw new ApiError(401,'Unauthorized request');
        }
        //agar token hai toh check if it matches with the token in database for that user
    
        const decodedToken=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)
        
        const user=await User.findById(decodedToken._id).select("-password -refreshToken")
        //now we have  found user based on decoded and token and authorized it
        if(!user){
            //to do
            throw new ApiError(401,'Unauthorized request');
        }
        //we have user
        //then send the user data to next middleware or controller
        //ab humein user mila this user we can use in our logOut controller
        //pehele we didnt have access to user in logOUt controller
        req.user=user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || 'Unauthorized request');
    }
})