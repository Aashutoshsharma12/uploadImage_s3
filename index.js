require('dotenv').config()
const express = require('express')
const Router = require('express')
const redis = require('ioredis')
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
AWS.config.update({ region: process.env.REGION });
var s3 = new AWS.S3({
    credentials: {
        accessKeyId: process.env.ACCESSKEY_ID,
        secretAccessKey: process.env.SECRETACCESS_KEY
    }
});

const publisher = redis.createClient({ host: '127.0.0.1', port: 6379, auth_pass: "P@ssw0rd" });
app.get('/', (req, res) => {
    res.send('Redis Publisher active at 3098')
})

app.get('/publish', async (req, res) => {
    try {
        const id = 12
        const product = {
            id, name: `product${id}`
        }
        publisher.publish('products', JSON.stringify(product), (err, reply) => {
            if (err) {
                console.error(err, "err");
                res.send('Failed to publish the product');
            } else {
                res.send('Product published successfully');
            }
        });
    } catch (error) {
        console.log(error)
    }
})

//add data in redis
app.post('/addData', async (req, res) => {
    try {
        var key = req.body.keyName
        var obj = {
            id: req.body.id,
            name: req.body.name
        }
        const value = JSON.stringify(obj);
        publisher.set(key, value, (error, reply) => {
            // publisher.set('name12',"asbhu", (error, reply) => {
            if (error) {
                res.send(error);
            } else {
                res.send(reply)
            }
        });
    } catch (error) {
        console.log(error)
    }
})

//get data from redis using key name
app.get('/getData', (req, res) => {
    try {
        var keyName = 'details'
        publisher.get(keyName, (error, value) => {
            if (error) {
                res.send(error)
            } else {
                res.send(value)
                // publisher.quit();
            }
        });
    } catch (error) {
        console.log(error)
    }
})

//list 
app.get('/list', (req, res) => {
    try {
        var data = []
        var data11 = []
        let retrievedKeys = 0;
        publisher.keys('*', (error, keys) => {
            if (error) {
                res.send(error);
            } else {
                if (keys.length === 0) {
                    res.status(200).json(data);
                }
                keys.forEach((key) => {
                    publisher.get(key, (err, value) => {
                        if (err) {
                            res.send(err);
                        }
                        console.log(value, "slsl")
                        data.push({ key, value: JSON.parse(value) });
                        // data.push({ key, value: value });

                        retrievedKeys++;

                        if (retrievedKeys === keys.length) {
                            res.status(200).json(data);
                        }
                    });
                });
            }
        });
    } catch (error) {
        console.log(error)
    }
});
//delete data from redis
app.post('/delete', (req, res) => {
    try {
        var keyName = req.body.keyName
        publisher.del(keyName, (err, value) => {
            if (err) {
                res.status(400).json(err)
            } else {
                res.status(200).json(value)
            }
        })
    } catch (err) {
        console.log(err)
    }
})

//pagination in list
app.post('/pagination_list', (req, res) => {
    try {
        var pageNumber = req.body.pageNo ? req.body.pageNo : 1;
        var itemsPerPage = req.body.perPage ? req.body.perPage : 1;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage - 1;
        console.log(startIndex, "s;lsls", endIndex)
        // Assuming you have a Redis list named 'myDataList'
        publisher.lrange('name1', startIndex, endIndex, (err, data) => {
            if (err) {
                res.json(err);
            } else {
                res.json(data);
            }
        });
    } catch (error) {
        console.log(error)
    }
})

//search data 
app.get('/searchData', async (req, res) => {
    try {
        var cursor = '0'; // Initial cursor value
        let keys = [];
        const pattern = req.body.key + "*";
        // do {
        //     const [newCursor, retrievedKeys] = await publisher.scan(cursor, 'MATCH', pattern);
        //     cursor = newCursor;
        //     keys.push(...retrievedKeys);
        // } while (cursor !== '0');
        const [newcursor, retrievedKeys] = await publisher.scan(cursor, 'MATCH', pattern);
        if (retrievedKeys.length) {
            for (let i = 0; i < retrievedKeys.length; i++) {
                const data = await publisher.get(retrievedKeys[i]);
                keys.push({ key: retrievedKeys[i], details: JSON.parse(data) });
            }
            res.json({ data: keys });
        } else {
            res.json({ data: keys });
        }

    } catch (err) {
        console.log(err)
    }
})

//multisearch
app.get('/multi_search', async (req, res) => {
    try {
        // const searchPatterns = ['name*', 'key'];
        const searchPatterns = req.body.search
        let matchingKeys = []
        const multi = publisher.multi();
        for (const pattern of searchPatterns) {
            multi.scan(0, 'MATCH', pattern);
        }
        const searchResults = await multi.exec();
        console.log(searchPatterns, "slls")
        for (const [result, error] of searchResults) {
            if (error) {
                console.error('Error executing search:', error);
            } else {
                const [, keys] = result;
                matchingKeys.push(...keys);
            }
        }
        res.json({ data: matchingKeys })
    } catch (err) {
        console.log(err)
    }
})

//Add data in list
app.post('/addList', (req, res) => {
    try {
        var list = req.body.listName
        var value = req.body.value
        // For adding data to a list:
        const data = publisher.rpush(list, 'item1', 'item2', 'item3');
        console.log({ data: data })
        res.json({ data: data })
    } catch (err) {
        console.log(err);
    }
})
//get  list data
app.post('/getList', (req, res) => {
    try {
        //get list
        publisher.lrange(req.body.listName, 0, -1, (error, response) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log('List elements:', response);
            res.json({ data: response })
        });
    } catch (err) {
        console.log(err);
    }
})
//delete  list 
app.post('/deleteList', (req, res) => {
    try {

        //delete list
        publisher.del(req.body.listName, (error, response) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log('List deleted successfully');
            res.json({ message: "List deleted successfully" })
        })
    } catch (err) {
        console.log(err);
    }
})

//Add data in Hash
app.post('/addHash', (req, res) => {
    try {
        var key = req.body.key
        var value = req.body.value
        const data = publisher.hset(req.body.hashName, key, value);
        console.log({ data: data })
        res.json({ data: data })
    } catch (err) {
        console.log(err);
    }
})
//get  hash data
app.post('/getHash', (req, res) => {
    try {
        //get hash
        publisher.hgetall(req.body.hashName, (error, response) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log('List elements:', response);
            res.json({ data: response })
        });
    } catch (err) {
        console.log(err);
    }
})
//delete  hash 
app.post('/deleteHash', (req, res) => {
    try {
        //delete hash
        publisher.del(req.body.hashName, (error, response) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log('hash deleted successfully');
            res.json({ message: "Hash deleted successfully" })
        })
    } catch (err) {
        console.log(err);
    }
})
//get all hash data
app.post('/searchHash_data', (req, res) => {
    try {

        const hashKey = req.body.hashName;
        const searchField = req.body.key;
        const searchValue = req.body.value;
        console.log(hashKey, "slkdkd", searchField, ",mcmc", searchValue)
        publisher.hscan(hashKey, 0, 'MATCH', `*${searchField}*${searchValue}*`, (error, result) => {
            if (error) {
                console.error(error);
                return;
            }
            const matchingFields = result[1];
            res.json({ data: matchingFields })
            console.log('Matching Fields:', matchingFields);
        });
    } catch (error) {
        console.log(error)
    }
})

//all hash
app.post('/allHash', (req, res) => {
    try {
        const results = [];

        publisher.keys('*', (error, keys) => {
            if (error) {
                console.error(error);
                return;
            }
            if (keys.length) {
                keys.forEach((key) => {
                    publisher.hgetall(key, (error, value) => {
                        if (error) {
                            console.error(error);
                            return;
                        }
                        results.push({ key, value });

                        if (results.length === keys.length) {
                            console.log('Hash Data:', results);
                            res.json({ data: results })
                            // Handle the retrieved data here
                        }
                    });
                });
            } else {
                res.json({ data: [] })
            }

            // console.log('All Hash Keys:', keys);

        })
    } catch (error) {
        console.log(error)
    }
})


publisher.on('error', (error) => {
    console.error('Redis Error:', error);
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