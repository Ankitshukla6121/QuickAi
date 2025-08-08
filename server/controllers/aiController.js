import OpenAI from "openai";
import sql from '../config/db.js';
import { clerkClient } from "@clerk/express";
import axios from 'axios'
import {v2 as cloudinary} from 'cloudinary';

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
        }

        if (!prompt) {
            return res.json({ success: false, message: "Prompt cannot be empty." });
        }

        const response = await AI.chat.completions.create({
            model: "gemini-1.5-flash", 
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: length,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations(user_id, prompt, content, type) VALUES(${userId}, ${prompt}, ${content}, 'article')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success: true, content });
    } catch (error) {
        console.error("Error generating article:", error);
        res.json({ success: false, message: error.message });
    }
};


export const generateBlogTiltle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
        }

        if (!prompt) {
            return res.json({ success: false, message: "Prompt cannot be empty." });
        }

        const response = await AI.chat.completions.create({
            model: "gemini-1.5-flash", 
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations(user_id, prompt, content, type) VALUES(${userId}, ${prompt}, ${content}, 'blog-title')`;

        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success: true, content });
    } catch (error) {
        console.error("Error generating article:", error);
        res.json({ success: false, message: error.message });
    }
};

export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;
        

        if (plan !== 'premium' ) {
            return res.json({ success: false, message: "this feature is only available for premium subscriptios." });
        }

        if (!prompt) {
            return res.json({ success: false, message: "Prompt cannot be empty." });
        }

       const formData = new FormData()
formData.append('prompt', prompt);
 const {data}= await axios.post("https://clipdrop-api.co/text-to-image/v1",formData,{
    headers:{
         'x-api-key': process.env.CLIPDROP_API_KEY
    },
    responseType:"arrayBuffer",
  })


  const base64Image= `data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`;

 const {secure_url}= await cloudinary.uploader.upload(base64Image)

        await sql`INSERT INTO creations(user_id, prompt, content, type, publish) VALUES(${userId}, ${prompt}, ${secure_url}, 'image',${publish?? false})`;

        

        res.json({ success: true, secure_url });
    } catch (error) {
        console.error("Error generating article:", error);
        res.json({ success: false, message: error.message });
    }
};
