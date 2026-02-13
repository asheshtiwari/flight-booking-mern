require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { CohereClient } = require("cohere-ai");

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Cohere AI with API Key from environment variable
const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY, 
});

// MongoDB Local Connection
mongoose.connect('mongodb://127.0.0.1:27017/flightDB')
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.log('DB Connection Error:', err));

// --- DATA MODELS ---

const Flight = mongoose.model('Flight', {
    flight_id: String,
    airline: String,
    departure_city: String,
    arrival_city: String,
    base_price: Number
});

const User = mongoose.model('User', {
    name: String,
    wallet_balance: { type: Number, default: 50000 },
    bookings: Array
});

const Attempt = mongoose.model('Attempt', {
    flight_id: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now }
});

// --- API ROUTES ---

// 1. AI Chatbot Route - Handles Travel Queries (Using Cohere)
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        const response = await cohere.chat({
            model: "command-a-03-2025", // This is the active lightweight model
            message: `You are an AI assistant for TravelPortal. 
            Answer this user query briefly and professionally: "${message}". 
            If they ask about flight prices, explain that high demand triggers a 10% surge pricing logic on our platform.`,
        });

        res.json({ reply: response.text });
    } catch (err) {
        console.error("AI Assistant Error:", err);
        res.status(500).json({ reply: "I am currently offline. Please try again later." });
    }
});

// 2. Fetch Flights with Search Filter and Surge Pricing Logic
app.get('/api/flights', async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = {};

        if (from) query.departure_city = new RegExp(from, 'i');
        if (to) query.arrival_city = new RegExp(to, 'i');

        const flights = await Flight.find(query);

        const updatedFlights = await Promise.all(flights.map(async (f) => {
            const count = await Attempt.countDocuments({ flight_id: f._id });
            
            let currentPrice = f.base_price;
            let isSurge = false;

            if (count >= 3) {
                currentPrice = Math.round(f.base_price * 1.10);
                isSurge = true;
            }
            return { ...f._doc, current_price: currentPrice, isSurge };
        }));

        res.json(updatedFlights);
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 3. Log a search/click attempt to trigger Surge Pricing
app.post('/api/log-attempt/:id', async (req, res) => {
    try {
        await new Attempt({ flight_id: req.params.id }).save();
        res.json({ message: "Attempt logged successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to log attempt" });
    }
});

// 4. Get User Profile and Balance
app.get('/api/user', async (req, res) => {
    try {
        let user = await User.findOne();
        if (!user) user = await User.create({ name: "Ashesh", wallet_balance: 50000, bookings: [] });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// 5. Handle Flight Booking and Wallet Deduction
app.post('/api/book', async (req, res) => {
    try {
        const { airline, price, route } = req.body;
        const user = await User.findOne();

        if (user.wallet_balance < price) {
            return res.status(400).json({ message: "Insufficient wallet balance!" });
        }

        const pnr = "PNR" + Math.floor(Math.random() * 900000);
        const newBooking = { pnr, airline, amount_paid: price, route, date: new Date() };

        user.wallet_balance -= price;
        user.bookings.push(newBooking);
        await user.save();

        res.json({ message: "Booking confirmed", booking: newBooking });
    } catch (err) {
        res.status(500).json({ error: "Booking failed" });
    }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));