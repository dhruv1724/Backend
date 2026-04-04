import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const registerUser= asyncHandler(async(req,res)=>{
    //get user details from frontend 
    //validation - non empty fields, email format, password strength
    //check if user already exists in database mail and username unique check 
    //check for images->avatar
    //upload them to cloudinary 
    //multer and cloudinary check lgana pdega
    //create user object- create entry in db
    //remove password and refresh token from response and send it to frontend
    //check for user creation success and fail i.e null
    //return response
    const {username,fullname,email,password}=req.body;
    //console.log("email: ",email)
    
    if([fullname,email,password,username].some((field)=> field?.trim()=='')){
        throw new ApiError(400,'All fields are required'); //400 bad request
    }

    const existedUser=await User.findOne({ $or:[{email}, {username}] })

    if(existedUser){
        throw new ApiError(409,'User with email or username already exists'); //409 conflict
    }

    const avatarLocalPath=req.files?.avatar[0]?.path; //multer se file upload hone ke baad req.files me aata hai, avatar field ke andar, aur uska path chahiye hume cloudinary me upload karne ke liye

    //const coverImageLocalPath=req.files?.coverImage[0]?.path; //coverImage field ke andar bhi ho sakta hai
    console.log(req.files);
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){ 
        throw new ApiError(400,'Avatar image is required'); //400 bad request
    }
    

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,'avatar is required'); //500 internal server error
    }
    
    const aUser=await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //yeh required nhi hai toh coverImage?.url || "" kr diya
        email,
        password,
        username: username.toLowerCase()    
    })

    const createdUser=await User.findById(aUser._id).select("-password -refreshToken") //password aur refresh token ko response me nahi bhejna hai

    if(!createdUser){
        throw new ApiError(500,'User creation failed'); //500 internal server error
    }
    
    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User created successfully')
    );

})

const generateAccessAndRefreshToken= async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=await user.generateAccessToken();
        const refreshToken=await user.generateRefreshToken();
        //refrsh token to databse
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false}) //password ko validate nahi karna hai save karte time;
        
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,'Token generation failed');
    }
}

const loginUser=asyncHandler(async(req,res)=>{
    //to-dos
    //get email and password from frontend ///req body se data le aao
    //it should not be empty
    //then check is user exist in database with email
    //if not throw error
    //then compare password with hashed password in database
    //if not match then throw error
    //if match then generate access token and refresh token
    //save refresh token in database for that user
    //send access token and refresh token to frontend
    //we send these tokens in secure cookies
    const {username,email,password}=req.body;
    if(!email && !username){
        throw new ApiError(400,'Email or username is required'); //400 bad request
    }

    const user=await User.findOne({ //User is used for findOne as User is a mongodb object/model
        $or:[{email},{username}]
    }) 

    if(!user){ 
        throw new ApiError(404,'User not found')
    }

    const isPasswordValid=await user.isPasswordCorrect(password); //this user is user found in mongo db so we can use the method we defined not of mongo db for this user

    if(!isPasswordValid){
        throw new ApiError(401,'Invalid user credentials');
    }
    const userId=user._id;
    //now generate accces and refresh token
    //we will create a method for this
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(userId);

    //send these tokens in secure cookies
    const loggedInUser=await User.findById(userId).select("-password -refreshToken") //password aur refresh token ko response me nahi bhejna hai

    const options={ //these are cookie options
        httpOnly:true, //client side js cannot access this cookie
        secure:true, //cookie only sent over https
    }

    return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options).
    json(
        new ApiResponse(200, {
            user:loggedInUser,
            accessToken,
            refreshToken //when user itself wants to save access token and refresh token in local storage or 
            // something then we can send it in response body also, but we will send it in cookies as well for security reasons
        }, 'User logged in successfully')
        //user bhejdo without password and refresh token and message bhi bhejdo
    );
})

const logoutUser= asyncHandler(async(req,res)=>{
    //to dos
    //clear the cookies 
    //reset the refresh token in database for that user
    //how to get user 
    const userId=req.user._id;
    await User.findByIdAndUpdate(userId, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true //updated document return krne ke liye
    });

    //now clear the cookies
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(
        new ApiResponse(200, {}, 'User logged out successfully')
    );

})

const refreshAccessToken= asyncHandler(async(req,res)=>{
    //to do
    //get refresh token from cookies
    //then verify it with token stored in database
    //if it matches then generate new access token and refresh token
    //then send it to user and also update the refresh token in database
    //if it does not match throw authentication error
    const IncomingrefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!IncomingrefreshToken){
        throw new ApiError(401,'Refresh token is required');
    }

    //user ke paas token hai voh encrypted hai while in database we have raw form
    //this jwt verify will give us the decoded token which has user id and other info we stored while generating token
    //verify token with database
    try {
        const decodedToken=jwt.verify(IncomingrefreshToken,process.env.REFRESH_TOKEN_SECRET);
        console.log(decodedToken);
    
        const user= await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(404,'Invalid refresh token - user not found');
        }
    
        //now token is valid here
        if(user.refreshToken !== IncomingrefreshToken){
            throw new ApiError(401,'Refresh token is Old or used');
        }
        
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id);
    
        const options={
            httpOnly:true,
            secure:true,
        }
    
        return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', newRefreshToken, options)
        .json(
            new ApiResponse(200, {
                accessToken,
                newRefreshToken
            }, 'Access token refreshed successfully')
        );
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
    }
})

export {registerUser, loginUser,logoutUser, refreshAccessToken}; 