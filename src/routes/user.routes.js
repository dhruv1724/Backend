import Router from 'express';
import {loginUser, logoutUser, refreshAccessToken, registerUser} from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import {verifyUser} from '../middlewares/auth.middleware.js'; 
const router=Router();
router.route('/register').post(
    upload.fields([
        {
            name:'avatar', 
            maxCount:1
        },
        {
            name:'coverImage',
            maxCount:1
        }
    ]),
    registerUser);

    //note this upload is middleware which helps in parsing of form data
router.route('/login').post(loginUser);

//secured routes
router.route('/logout').post(verifyUser, logoutUser);
router.route('/refresh').post( refreshAccessToken);
export default router;