import connectDB from './db/database.js';
import dotenv from 'dotenv';
import { app } from './app.js';
dotenv.config({
    path:'./.env'
}); 


connectDB() //async method returns a promise, so we can use .then() and .catch() to handle the promise
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err)=>{
    console.error('Error connecting to MongoDB:', err);
})
/*
const app = express();

;(async () => { 
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        app.on("error",()=>{
            console.error('Error connecting to MongoDB for app', error);
            throw error; 
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error; // Rethrow the error to be caught by the outer catch block
    }
})(); //this is a iffy which is used to run the code immediately after it is defined.
*/