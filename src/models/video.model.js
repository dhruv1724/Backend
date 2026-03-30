import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

 const videoSchema = new Schema(
    {
        videoFile:{
            type:String,
            required:true
        },
        thumbnail:{
            type:String,
            required:true
        },
        title:{
            type:String,
            required:true
        },
        Description:{
            type:String,
            required:true
        },
        duration:{
            type:Number, // we will get this from cloudinary response   
            required:true
        },
        views:{
            type:Number,
            default: 0
        },
        isPublished:{
            type:Boolean,
            default:true
        },  
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        }
    },
    {timestamps:true}
)

videoSchema.plugin(mongooseAggregatePaginate); //used to write aggregation query
export const Video = mongoose.model("Video", videoSchema);