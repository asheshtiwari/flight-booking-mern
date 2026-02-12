const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Local Connection
mongoose.connect('mongodb://127.0.0.1:27017/flightDB')
    .then(() => console.log(' MongoDB Connected Successfully!'))
    .catch(err => console.log(' DB Connection Error:', err));

// --- DATA MODELS ---

// Model for Flight details
const Flight = mongoose.model('Flight', {
    flight_id: String,
    airline: String,
    departure_city: String,
    arrival_city: String,
    base_price: Number
});

// Model for User profile and Wallet
const User = mongoose.model('User', {
    name: String,
    wallet_balance: { type: Number, default: 50000 },
    bookings: Array
});

// Model to track booking attempts for Surge Pricing logic
const Attempt = mongoose.model('Attempt', {
    flight_id: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now }
});

// --- API ROUTES ---

// 1. Fetch Flights with Search Filter and Surge Pricing Logic
app.get('/api/flights', async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = {};

        // Apply case-insensitive filters if search parameters exist
        if (from) query.departure_city = new RegExp(from, 'i');
        if (to) query.arrival_city = new RegExp(to, 'i');

        const flights = await Flight.find(query);

        // Map through flights to calculate real-time surge prices
        const updatedFlights = await Promise.all(flights.map(async (f) => {
            // Count total attempts logged for this specific flight ID
            const count = await Attempt.countDocuments({ flight_id: f._id });
            
            let currentPrice = f.base_price;
            let isSurge = false;

            // Logic: Increase price by 10% if 3 or more attempts are recorded
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

// 2. Log a search/click attempt to trigger Surge Pricing
app.post('/api/log-attempt/:id', async (req, res) => {
    try {
        await new Attempt({ flight_id: req.params.id }).save();
        res.json({ message: "Attempt logged successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to log attempt" });
    }
});

// 3. Get User Profile and Balance
app.get('/api/user', async (req, res) => {
    let user = await User.findOne();
    // Create a default user if database is empty
    if (!user) user = await User.create({ name: "Ashesh", wallet_balance: 50000, bookings: [] });
    res.json(user);
});

// 4. Handle Flight Booking and Wallet Deduction
app.post('/api/book', async (req, res) => {
    const { airline, price, route } = req.body;
    const user = await User.findOne();

    // Validate if user has enough money
    if (user.wallet_balance < price) {
        return res.status(400).json({ message: "Insufficient wallet balance!" });
    }

    // Generate a random PNR and save booking
    const pnr = "PNR" + Math.floor(Math.random() * 900000);
    const newBooking = { pnr, airline, amount_paid: price, route, date: new Date() };

    user.wallet_balance -= price;
    user.bookings.push(newBooking);
    await user.save();

    res.json({ message: "Booking confirmed", booking: newBooking });
});

app.listen(5000, () => console.log(' Backend running on http://localhost:5000'));