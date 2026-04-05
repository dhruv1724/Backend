import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
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
  const { username, fullname, email, password } = req.body;
  //console.log("email: ",email)

  if (
    [fullname, email, password, username].some((field) => field?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required"); //400 bad request
  }

  const existedUser = await User.findOne({ $or: [{ email }, { username }] });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists"); //409 conflict
  }

  const avatarLocalPath = req.files?.avatar[0]?.path; //multer se file upload hone ke baad req.files me aata hai, avatar field ke andar, aur uska path chahiye hume cloudinary me upload karne ke liye

  //const coverImageLocalPath=req.files?.coverImage[0]?.path; //coverImage field ke andar bhi ho sakta hai
  console.log(req.files);
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required"); //400 bad request
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar is required"); //500 internal server error
  }

  const aUser = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", //yeh required nhi hai toh coverImage?.url || "" kr diya
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(aUser._id).select(
    "-password -refreshToken"
  ); //password aur refresh token ko response me nahi bhejna hai

  if (!createdUser) {
    throw new ApiError(500, "User creation failed"); //500 internal server error
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    //refrsh token to databse
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //password ko validate nahi karna hai save karte time;

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};

const loginUser = asyncHandler(async (req, res) => {
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
  const { username, email, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Email or username is required"); //400 bad request
  }

  const user = await User.findOne({
    //User is used for findOne as User is a mongodb object/model
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //this user is user found in mongo db so we can use the method we defined not of mongo db for this user

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const userId = user._id;
  //now generate accces and refresh token
  //we will create a method for this
  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(userId);

  //send these tokens in secure cookies
  const loggedInUser = await User.findById(userId).select(
    "-password -refreshToken"
  ); //password aur refresh token ko response me nahi bhejna hai

  const options = {
    //these are cookie options
    httpOnly: true, //client side js cannot access this cookie
    secure: true, //cookie only sent over https
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, //when user itself wants to save access token and refresh token in local storage or
          // something then we can send it in response body also, but we will send it in cookies as well for security reasons
        },
        "User logged in successfully"
      )
      //user bhejdo without password and refresh token and message bhi bhejdo
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //to dos
  //clear the cookies
  //reset the refresh token in database for that user
  //how to get user
  const userId = req.user._id;
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, //updated document return krne ke liye
    }
  );

  //now clear the cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //to do
  //get refresh token from cookies
  //then verify it with token stored in database
  //if it matches then generate new access token and refresh token
  //then send it to user and also update the refresh token in database
  //if it does not match throw authentication error
  const IncomingrefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!IncomingrefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  //user ke paas token hai voh encrypted hai while in database we have raw form
  //this jwt verify will give us the decoded token which has user id and other info we stored while generating token
  //verify token with database
  try {
    const decodedToken = jwt.verify(
      IncomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log(decodedToken);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Invalid refresh token - user not found");
    }

    //now token is valid here
    if (user.refreshToken !== IncomingrefreshToken) {
      throw new ApiError(401, "Refresh token is Old or used");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //to-do
  //find user
  //then check if password mentioned is same or not
  //then change the password to newpassword in database
  //i.e update the user
  const user = User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  console.log(req.user);
  console.log(req.body);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid password");
  }

  //old password is correct here
  //set the new password
  //pre vala hook chlega
  await user.save({ validateBeforeSave: false }); //save krte time pre vala hook call hoga

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getUser = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  //file updation ke liye alag end points for image and avatar
  if (!fullname || !email) {
    throw new ApiError(400, "fullname or email is required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    { new: true } //after updating it wil return true
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "account updated"));
});

const updateAvatar = asyncHandler(async(req,res)=>{
    //to-do
    //get user by id
    //get the new uploaded file
    //then follow the event flow of multer->cloudinary
    //then apply find by id and update 
    //return updated user 
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar=uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,{user},"avatar updated successfully")
    )

});
const updateCoverImage = asyncHandler(async(req,res)=>{
    //to-do
    //get user by id
    //get the new uploaded file
    //then follow the event flow of multer->cloudinary
    //then apply find by id and update 
    //return updated user 
    const imageLocalPath=req.file?.path
    if(!imageLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const image=uploadOnCloudinary(imageLocalPath);

    if(!image.url){
        throw new ApiError(400,"error while uploading on image")
    }

    const user=await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                coverImage:image.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,{user},"image updated successfully")
    )

});

const getUserChannelProfile= asyncHandler(async(req,res)=>{
  const {username}=req.params; //url se data lena

  if(!username?.trim()){
    throw new ApiError(400,"username is missing")
  }

  const channel=await User.aggregate([
    {
      $match:{
        username: username //database se voh document aa gya jahan username vhi hai jo param se mila
      }
    },
    {
      $lookup:{
        from:"subscriptions",//username dekho konse konse subscription document mei hai
        localField:"_id",
        foreignField:"channel",
        as:"subscribers" //konse konse document mei channel mei yeh username/id available hai
      }
    },
    {
      $lookup:{
        from:"subscriptions",//username dekho konse konse subscription document mei hai
        localField:"_id",
        foreignField:"subcriber", //hum ab yeh dekh rhe hai iss username ki id konse konse document as a subcriber field mei hai
        as:"subscribedTo" //konse konse document mei channel mei yeh username available hai
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size: "$subscribers"
        },
        channelsSubscribedTo:{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in: [req.user?._id, "$subscribers.subcriber"]},
            then: true,
            else: false
          }
        }
      }
    },//user model mei ab yeh do field add ho gyi hai
    {
      $project: {
        fullname:1,
        username:1,
        subscribersCount:1,
        channelsSubscribedTo:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1 //project only voh field bhejta hai jo required hai not all the field 
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404,"channel does not exist")
  }

  return res.send(200).json(
    new ApiResponse(200,channel[0],"profile of channel fetched successfully")
  )
})

//note when we do req.user?.id we get mongo db id this happens because mongoose converts the string id in the id 
//of mongoose i.e we are originally getting string id in pipelines setup no mongoose is involved
//so here we convert it manually
const getWatchHistory= asyncHandler(async(req,res)=>{
  const user= await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField: "_id",
              as:"owner",
              pipeline:[
                {
                  $project: {
                    fullName: 1,
                    userName:1,
                    avatar:1
                  }
                }
              ]
            }
          },{
            //yahan se hum frontend ko array ka first element bhejne ke liye pipeline bna rhe hai
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "watchHistory fetched successfully"
    )
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
