 import express from 'express'
import { generateArticle, generateBlogTiltle, generateImage } from '../controllers/aiController.js';
import {auth} from '../middlewares/auth.js'
 const aiRouter= express.Router();

 aiRouter.post(`/generate-article`,auth , generateArticle)
 aiRouter.post(`/generate-blog-title`,auth , generateBlogTiltle)

 aiRouter.post(`/generate-image`,auth , generateImage)



 export default aiRouter;