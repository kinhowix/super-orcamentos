import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: The JS SDK doesn't have a direct listModels, 
    // but we can try to initialize a model and check if it throws 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Model gemini-1.5-flash initialized.");
  } catch (e) {
    console.error("Error:", e);
  }
}

listModels();
