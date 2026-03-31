import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary, uploadToCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

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

    const existedUser=User.findOne({ $or:[{email}, {username}] })

    if(existedUser){
        throw new ApiError(409,'User with email or username already exists'); //409 conflict
    }

    const avatarLocalPath=req.files?.avatar[0]?.path; //multer se file upload hone ke baad req.files me aata hai, avatar field ke andar, aur uska path chahiye hume cloudinary me upload karne ke liye
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path; //coverImage field ke andar bhi ho sakta hai
    if(!avatarLocalPath){ 
        throw new ApiError(400,'Avatar image is required'); //400 bad request
    }
    if(!coverImageLocalPath){ 
        throw new ApiError(400,'Cover image is required'); //400 bad request
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

export {registerUser}