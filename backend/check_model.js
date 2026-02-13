require('dotenv').config();

async function listGoogleModels() {
    const key = process.env.GEMINI_API_KEY;
    
    if (!key || key.startsWith("Your_API_Key")) {
        console.log("❌ Error: .env file mein API Key sahi nahi hai.");
        return;
    }

    console.log("🔍 Google Server se models ki list mangwa rahe hain...");
    
    // Hum seedha Google ke URL par request bhej rahe hain (No Library used)
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.log("\n❌ Server Error:", data.error.message);
        } else if (data.models) {
            console.log("\n✅ SUCCESS! Ye models available hain:");
            // Sirf wahi models dikhao jo chat ke liye hain
            const chatModels = data.models.filter(m => m.name.includes('gemini'));
            chatModels.forEach(m => console.log(` - ${m.name.replace('models/', '')}`));
            
            console.log("\n👉 Ab server.js mein upar wala koi bhi ek naam use karein!");
        } else {
            console.log("\n⚠️ Ajeeb response aaya:", data);
        }
    } catch (error) {
        console.log("\n❌ Internet Connection Error:", error.message);
    }
}

listGoogleModels();