import express from "express";
import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// DigitalOcean Spaces config
const spacesEndpoint = new AWS.Endpoint("blr1.digitaloceanspaces.com"); // change region if needed
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
});

const BUCKET = "milestone";  // your bucket name
const BASE_URL = "https://milestone.blr1.digitaloceanspaces.com"; // adjust region if needed

app.get("/images", async (req, res) => {
    try {
        // 1. Fetch list of prompt files
        const promptList = await s3
            .listObjectsV2({
                Bucket: BUCKET,
                Prefix: "KiddoSnap/prompts/"
            })
            .promise();

        const prompts = promptList.Contents.filter(f => f.Key.endsWith(".txt"));

        const results = [];

        // 2. Loop through each prompt like image-1.txt
        for (const promptFile of prompts) {
            const fileName = promptFile.Key.split("/").pop(); // image-1.txt
            const fileNumber = fileName.replace(".txt", "").split("-")[1]; // 1

            // 3. Get prompt text
            const promptData = await s3
                .getObject({
                    Bucket: BUCKET,
                    Key: promptFile.Key
                })
                .promise();

            const promptText = promptData.Body.toString("utf8");

            // 4. Build thumbnail URL
            const thumbUrl = `${BASE_URL}/KiddoSnap/thumbnails/thumb-image-${fileNumber}.png`;

            results.push({
                file: fileName,
                prompt: promptText,
                thumbnail: thumbUrl
            });
        }

        res.json({ images: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

app.listen(3000, () => console.log("API running on port 3000"));

