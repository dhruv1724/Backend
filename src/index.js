import connectDB from './db/database.js';
import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
}); 


connectDB();
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