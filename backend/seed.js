const mongoose = require('mongoose');

// Connect to the same database you used in server.js
mongoose.connect('mongodb://127.0.0.1:27017/flightDB');

const Flight = mongoose.model('Flight', {
    flight_id: String,
    airline: String,
    departure_city: String,
    arrival_city: String,
    base_price: Number
});

const sampleFlights = [
    { flight_id: "AI-101", airline: "Air India", departure_city: "Mumbai", arrival_city: "Delhi", base_price: 5000 },
    { flight_id: "6E-202", airline: "IndiGo", departure_city: "Delhi", arrival_city: "Mumbai", base_price: 4500 },
    { flight_id: "UK-303", airline: "Vistara", departure_city: "Bangalore", arrival_city: "Delhi", base_price: 6000 },
    { flight_id: "SG-404", airline: "SpiceJet", departure_city: "Mumbai", arrival_city: "Bangalore", base_price: 3500 },
    { flight_id: "QP-505", airline: "Akasa Air", departure_city: "Kolkata", arrival_city: "Mumbai", base_price: 4200 }
];

const seedDB = async () => {
    try {
        await Flight.deleteMany({}); // Clears existing data
        await Flight.insertMany(sampleFlights);
        console.log("✅ Database Seeded with Sample Flights!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();