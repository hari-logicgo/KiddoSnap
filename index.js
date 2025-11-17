import express from "express";
import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// AUTH MIDDLEWARE
function authMiddleware(req, res, next) {
    const clientKey = req.headers["authorization"]; // expecting: Bearer <key>

    if (!clientKey) {
        return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = clientKey.replace("Bearer ", "").trim();

    if (token !== process.env.API_SECRET_KEY) {
        return res.status(403).json({ error: "Invalid authorization token" });
    }

    next();
}

// DigitalOcean Spaces config
const spacesEndpoint = new AWS.Endpoint("blr1.digitaloceanspaces.com");
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
});

const BUCKET = "milestone";
const BASE_URL = "https://milestone.blr1.digitaloceanspaces.com";

// PROTECTED ENDPOINT
app.get("/images", authMiddleware, async (req, res) => {
    try {
        const promptList = await s3
            .listObjectsV2({
                Bucket: BUCKET,
                Prefix: "KiddoSnap/prompts/"
            })
            .promise();

        const prompts = promptList.Contents.filter(f => f.Key.endsWith(".txt"));
        const results = [];

        for (const promptFile of prompts) {
            const fileName = promptFile.Key.split("/").pop();
            const fileNumber = fileName.replace(".txt", "").split("-")[1];

            const promptData = await s3
                .getObject({
                    Bucket: BUCKET,
                    Key: promptFile.Key
                })
                .promise();

            const promptText = promptData.Body.toString("utf8");
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
