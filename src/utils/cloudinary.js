import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,  
});


//uploaing file on cloudinary from local file path
const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto', 
        })
        //file has been uploaded successfully
        fs.unlinkSync(localFilePath) //remove the file from local storage as upload operation is successful
        return response //this response will be sent to the client
    } catch (error) {
        console.error("error while uploading file on cloudinary ", error);
         // delete if exists
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
 //remove the file from local storage as upload operation is failed
        //server se hta do ab kyukki server pr hai but cloudinary pr nahi gya
        return null
    }
}

export {uploadOnCloudinary}; 