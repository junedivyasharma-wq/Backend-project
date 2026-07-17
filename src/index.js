// require('dotenv').config({path:'./env'})

import dotenv from "dotenv"

// import mongoose from "mongoose";
// import {DB_NAME} from "./constants";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()

/*
import express from "express"
const app= expres()
( async () => { 
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("ERRR:",error);
            throw error
        })
        // listen add kiya h ki agr express app import krane ke baad
        // agar vo kaam na kre ya usme koi problem ho toh

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    }catch(error){
        console.log("ERROR:",error);
    }
})();*/