import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;

const body = {
  contents: [
    {
      parts: [{ text: "Nævn 3 symptomer på lungeemboli" }]
    }
  ]
};

const headers = {
  "Content-Type": "application/json"
};

const res = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(body)
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
