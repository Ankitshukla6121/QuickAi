import OpenAI from "openai";
import sql from '../config/db.js';
import { clerkClient } from "@clerk/express";
import axios from 'axios'
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'
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

        if (plan !== 'premium') {
            return res.status(403).json({ success: false, message: "This feature is only available for premium subscriptions." });
        }

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt cannot be empty." });
        }

        const clipdropApiUrl = "https://clipdrop-api.co/text-to-image/v1";
        
        // Use a more direct approach to send the form data
        const response = await axios({
            method: 'post',
            url: clipdropApiUrl,
            data: {
                prompt: prompt
            },
            headers: {
                'x-api-key': process.env.CLIPDROP_API_KEY,
                'Content-Type': 'application/json' // Clipdrop API can accept JSON for text-to-image
            },
            responseType: 'arraybuffer'
        });

        const data = response.data;
        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;
        
        const { secure_url } = await cloudinary.uploader.upload(base64Image);

        await sql`INSERT INTO creations(user_id, prompt, content, type, publish) VALUES(${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;

        res.status(201).json({ success: true, secure_url });
    } catch (error) {
        res.json({success:false, message:error.message})
    }
};

export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {image}= req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.status(403).json({ success: false, message: "This feature is only available for premium subscriptions." });
        }

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt cannot be empty." });
        }
      

       
        const { secure_url } = await cloudinary.uploader.upload(image.path,{
            transformation:[
                {
                    effect:'background_removal',
                    background_removal:'remove_the_background'
                }
            ]
        });

        await sql`INSERT INTO creations(user_id, prompt, content, type) VALUES(${userId}, 'Remove background from image', ${secure_url}, 'image')`;

        res.status(201).json({ success: true, content:secure_url });
    } catch (error) {
        res.json({success:false, message:error.message});
    }
};

export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {object}= req.body
        const {image}= req.file;
        const plan = req.plan;
        
        if (plan !== 'premium') {
            return res.status(403).json({ success: false, message: "This feature is only available for premium subscriptions." });
        }

        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt cannot be empty." });
        }
      

       
        const { public_id } = await cloudinary.uploader.upload(image.path)

       const imageUrl= cloudinary.url(public_id,{
            transformation:[{effect:`gen_remove:${object}`}],
            resource_type:'image'
        })
    

        await sql`INSERT INTO creations(user_id, prompt, content, type) VALUES(${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

        res.status(201).json({ success: true, content:imageUrl });
    } catch (error) {
        res.json({success:false,message:error.message})
    }
};

export const resumeReview = async (req, res) => {
    try {
        const { userId } = req.auth();
        const resume= req.file;
        const plan = req.plan;
        
        if (plan !== 'premium') {
            return res.status(403).json({ success: false, message: "This feature is only available for premium subscriptions." });
        }

      if(resume.size > 5*1024*1024 ){
        return res.json({success:false,message:"Resume fiel size exceeds allowed size (5MB)."})
      }
    
      const dataBuffer = fs.readFileSync(resume.path)
      const pdfData= await pdf(dataBuffer);


      const prompt= `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement.Resume Content:\n\n${pdfData.text} `

       const response = await AI.chat.completions.create({
            model: "gemini-1.5-flash", 
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations(user_id, prompt, content, type) VALUES(${userId}, 'Review the uploaded resume', ${imageUrl}, 'resume-review')`;

        res.status(201).json({ success: true, content });
    } catch (error) {
        res.json({success:false,message:error.message})
    }
};