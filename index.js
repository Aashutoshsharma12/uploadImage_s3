require('dotenv').config()
const express = require('express')
const Router = require('express')
const fileUpload = require('express-fileupload')
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    limits: {
        fileSize: 50 * 1024 * 1024
    }
}));
const AWS = require('aws-sdk');
// import AWS from 'aws-sdk'
const BucketName = "graph-imageupload"
const region = 'ap-south-1'
// configure it with your AWS credentials:
console.log(process.env.REGION)
AWS.config.update({ region: process.env.REGION});
var s3 = new AWS.S3({
    credentials: {
        accessKeyId: process.env.ACCESSKEY_ID,
        secretAccessKey: process.env.SECRETACCESS_KEY
    }
});


//Upload Image 
app.post('/uploadImage', (req, res) => {
    try {
        const uploadParams = {
            Bucket: BucketName,
            Key: req.files.files.name,
            Body: Buffer.from(req.files.files.data), // Image buffer or stream
            ACL: req.body.ACL ? req.body.ACL : "private" // Set ACL to public-read for public access //private
        };
        s3.upload(uploadParams, async (err, data) => {
            if (err) {
                return res.status(400).json({ message: err });
            } else {
                return res.status(200).json({ message: "Image uploaded successfully", url: data.Location })
            }
        });
    } catch (err) {
        res.json({ message: err })
    }
}
)

// Delete Image
app.post('/deleteImage', (req, res) => {
    try {
        const imageUrl = req.body.imageUrl
        const lastSlashIndex = imageUrl.lastIndexOf('/');
        const filename = imageUrl.substring(lastSlashIndex + 1);

        const deleteParams = {
            Bucket: BucketName, //Bucket Name
            Key: filename, //Image Name 
        }
        s3.deleteObject(deleteParams, function (err, data) {
            if (err) {
                res.json({ errr: err })
            } else {
                res.json({ data, message: "Image delete successfully" })
            }
        });
    } catch (err) {
        res.json({ message: err })
    }
}
)

//image list ***************************************//
app.get('/imageList', (req, res) => {
    const listParams = {
        Bucket: BucketName
    };
    s3.listObjectsV2(listParams, function (err, data) {
        if (err) {
            return res.json({ message: err.message })
        } else {
            const imageDetails = data.Contents
            var array = []
            imageDetails.map((data) => {
                array.push({ "imageUrl": `https://${BucketName}.s3.${region}.amazonaws.com/${data.Key}` })
            })
            return res.json({ data: array })
        }
    });
}
)

//Private image url convert into public url for some time//
app.post('/pre_signedUrl', (req, res) => {
    try {
        const imageUrl = req.body.imageUrl
        const lastSlashIndex = imageUrl.lastIndexOf('/');
        const filename = imageUrl.substring(lastSlashIndex + 1);

        const getURLParams = {
            Bucket: BucketName, //Bucket Name
            Key: filename, //Image Name
            Expires: req.body.expiredTime // Expiration time in seconds (e.g., 1 hour)
        };
        const imageURL = s3.getSignedUrl('getObject', getURLParams);
        return res.json({ pre_signed_url: imageURL })
    } catch (err) {
        res.json({ message: err })
    }
}
)
app.listen(5002, () => {
    console.log('Server is running on 5002 port')
})