import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname)
    //this will  return the file with original name where it is saved in local storage
  }
})

export const upload = multer({ storage, })