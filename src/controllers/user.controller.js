import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResonse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser= asyncHandler(async (req,res)=>{


   const {fullName,email,username,password}=res.body;

   if([fullName,email,username,password].some((field)=>{
    return field?.trim()===  ""
   })){
    throw new ApiError(400,"All fields are required");
   }

   const existedUser=User.findOne({
    $or:[{username},{email}]
   })

   if(existedUser){
    throw new ApiError(409,"User with this username or email already exists")
   }
    
   const avatarLocalPath=req.files?.avatar[0]?.path;

   const coverImageLocalPath=req.files?.coverImage[0]?.path;
   
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
        username:username.toLowercase( ),
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


export {registerUser}