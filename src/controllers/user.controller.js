import { request } from "express";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResonse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefereshTokens= async(userId)=>{

    try{
        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"Something Went Wrong While generating refresh and accesss tokens ")
    }
}

const registerUser= asyncHandler(async (req,res)=>{

   console.log(req.files)
   const {fullName,email,username,password}=req.body;

   if([fullName,email,username,password].some((field)=>{
    return field?.trim()===  ""
   })){
    throw new ApiError(400,"All fields are required");
   }

   const existedUser= await User.findOne({
    $or:[{username},{email}]
   })

   if(existedUser){
    throw new ApiError(409,"User with this username or email already exists")
   }
    
   const avatarLocalPath=req.files?.avatar[0]?.path;

  
   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
    coverImageLocalPath=req.files.coverImage[0].path;
   }
   if(!avatarLocalPath){
    
    throw new ApiError(400,"Avatar should be uploaded");
   }

   const avatar= await uploadOnCloudinary(avatarLocalPath);

   const coverImage= await uploadOnCloudinary(coverImageLocalPath);

   if(!avatar){
     throw new ApiError(400,"Avatar should be uploaded");
   }

  const user= await User.create(
    {
        fullName,
        username:username.toLowerCase( ),
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
    }
   )

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User successfully registered")
   )
})

const loginUser=asyncHandler(async(req,res)=>{
    // req body-> data
    // username or email
    // find the user
    // password check
    // access token and refresh token
    // send cookie
    const {username,email,password}=req.body
    console.log(email);

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user= await User.findOne({$or:[{username},{email}]})
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

   const isPasswordvalid=await user.isPasswordCorrect(password) 
   
   if(!isPasswordvalid){
    throw new ApiError( 404,"Password is incorrect")
   }

    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)
   
   const loggedInUser= await User.findById(user._id).select(
    "-password -refreshToken"
   )

   const options={
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
        200,{
            user: loggedInUser, accessToken, refreshToken
        },
        "user logged in successfully"
    )
   )

})

const logoutUser=asyncHandler(async (req,res) => {
   await  User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true
        }

    )

    const options={
        httpOnly: true,
        secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200,{},"User logged Out Successfully"))


})

const refreshAccessToken= asyncHandler( async (req,res)=>{
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }


   try {
     const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
     const user= await User.findById(decodedToken?._id);
     if(!user){
         throw new ApiError(401,"Invalid refresh token");
     }
 
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh Token is expired or used")
     }
 
     const options={
         httpOnly: true,
         secure: true,
     }
 
 
     const {accessToken, newrefreshToken} = await generateAccessAndRefereshTokens(user._id);
     return res
     .status(200)
     .cookie("AccessToken", accessToken,options)
     .cookie("RefreshToken", newrefreshToken.options)
     .json(
         new ApiResponse(200, 
             {accessToken ,refreshToken: newrefreshToken},
             "Access token refreshed"
         )
     )
   } catch (error) {
     throw new ApiError(401, error?.message || "invalid refresh token")
   }
})
export {registerUser,loginUser,logoutUser, refreshAccessToken}