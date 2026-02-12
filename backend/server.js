const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. MongoDB Connection (Localhost use kar rahe hain)
mongoose.connect('mongodb://127.0.0.1:27017/flightBookingDB')
  .then(() => console.log(" MongoDB Connected Successfully!"))
  .catch(err => {
    console.error(" MongoDB Connection Error:");
    console.error(err.message);
    console.log("\nTip: Make sure MongoDB Service is running in Windows Services.");
  });
// 2. Flight Schema (Data Structure)
const flightSchema = new mongoose.Schema({
    flight_id: String,
    airline: String,
    departure_city: String,
    arrival_city: String,
    base_price: Number,
    search_history: [Date] 
});

// 3. User & Wallet Schema
const userSchema = new mongoose.Schema({
    name: { type: String, default: "Test User" },
    wallet_balance: { type: Number, default: 50000 },
    bookings: Array
});

const Flight = mongoose.model('Flight', flightSchema);
const User = mongoose.model('User', userSchema);

// 4. Seed Data (Flights ko Database mein insert karne ke liye)
const seedFlights = async () => {
    const count = await Flight.countDocuments();
    if (count === 0) {
        const initialFlights = [
            { flight_id: "AI-202", airline: "Air India", departure_city: "Delhi", arrival_city: "Mumbai", base_price: 2500 },
            { flight_id: "6E-501", airline: "IndiGo", departure_city: "Mumbai", arrival_city: "Bangalore", base_price: 2200 },
            { flight_id: "UK-812", airline: "Vistara", departure_city: "Delhi", arrival_city: "Goa", base_price: 3000 },
            { flight_id: "SG-105", airline: "SpiceJet", departure_city: "Kolkata", arrival_city: "Delhi", base_price: 2400 }
        ];
        await Flight.insertMany(initialFlights);
        if (!(await User.findOne())) await User.create({});
        console.log("Database Seeded with Flights!");
    }
};
seedFlights();

// --- API ROUTES ---

// Flight list with Surge Pricing logic
// SEARCH ROUTE
app.get('/api/flights', async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = {};

        if (from) query.departure_city = new RegExp(from, 'i');
        if (to) query.arrival_city = new RegExp(to, 'i');

        const flights = await Flight.find(query);

        // check for every flight for increasing the price
        const updatedFlights = await Promise.all(flights.map(async (f) => {
            const count = await Attempt.countDocuments({ flight_id: f._id });
            
            let currentPrice = f.base_price;
            let surgeActive = false;

            // Simple Logic: 3 click < 10%d increase
            if (count >= 3) {
                currentPrice = Math.round(f.base_price * 1.10);
                surgeActive = true;
            }

            return { 
                ...f._doc, 
                current_price: currentPrice, 
                isSurge: surgeActive 
            };
        }));

        res.json(updatedFlights);
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ error: "Data not get by Database" });
    }
});

// Log attempt for pricing
app.post('/api/log-attempt/:id', async (req, res) => {
    await Flight.findByIdAndUpdate(req.params.id, { $push: { search_history: new Date() } });
    res.sendStatus(200);
});

// Booking API with Wallet check
app.post('/api/book', async (req, res) => {
    const { flightId, price, airline, route } = req.body;
    const user = await User.findOne();

    if (user.wallet_balance < price) {
        return res.status(400).json({ message: "Insufficient Wallet Balance!" });
    }

    const pnr = "PNR" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const booking = { pnr, flightId, airline, route, amount_paid: price, date: new Date().toLocaleString() };

    user.wallet_balance -= price;
    user.bookings.push(booking);
    await user.save();

    res.json({ message: "Success", booking, newBalance: user.wallet_balance });
});

app.get('/api/user', async (req, res) => {
    const user = await User.findOne();
    res.json(user);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));