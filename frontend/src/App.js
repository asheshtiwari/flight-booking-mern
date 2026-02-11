import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';

// Backend API URL
const API = "http://localhost:5000/api";

function App() {
    const [flights, setFlights] = useState([]);
    const [user, setUser] = useState({ wallet_balance: 0, bookings: [] });
    const [msg, setMsg] = useState({ text: "", type: "" });

    // 1. Data load function
    const fetchData = async () => {
        try {
            const fRes = await axios.get(`${API}/flights`);
            const uRes = await axios.get(`${API}/user`);
            setFlights(fRes.data);
            setUser(uRes.data);
        } catch (err) {
            console.error("Connection Error:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Booking handle  function
    const handleBook = async (flight) => {
        try {
            // Step A: Attempt log  (Surge pricing check )
            await axios.post(`${API}/log-attempt/${flight._id}`);
            
            // Step B: Actual booking request
            const res = await axios.post(`${API}/book`, {
                flightId: flight.flight_id,
                airline: flight.airline,
                price: flight.current_price,
                route: `${flight.departure_city} -> ${flight.arrival_city}`
            });

            setMsg({ text: " Booking Success! PNR: " + res.data.booking.pnr, type: "success" });
            generatePDF(res.data.booking); // PDF download karein
            fetchData(); // for show Wallet and Price update 
        } catch (err) {
            setMsg({ 
                text: err.response?.data?.message || "Booking Failed!", 
                type: "error" 
            });
            fetchData(); // if error due to surge , new price 
        }
    };

    // 3. Professional PDF Generate  function
    const generatePDF = (b) => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("XTECHON TRAVELS - E-TICKET", 20, 20);
        doc.setFont("helvetica", "normal");
        doc.line(20, 25, 190, 25);
        doc.text(`PNR Number: ${b.pnr}`, 20, 40);
        doc.text(`Airline: ${b.airline}`, 20, 50);
        doc.text(`Route: ${b.route}`, 20, 60);
        doc.text(`Amount Paid: Rs. ${b.amount_paid}`, 20, 70);
        doc.text(`Status: CONFIRMED`, 20, 80);
        doc.save(`Ticket_${b.pnr}.pdf`);
    };

    return (
        <div className="container mt-5 py-4 shadow-lg rounded bg-light">
            {/* Bootstrap Link */}
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            
            <div className="row align-items-center bg-dark text-white p-4 rounded-3 mb-4">
                <div className="col-md-7">
                    <h1 className="display-6">✈️ Flight Booking Dashboard</h1>
                </div>
                <div className="col-md-5 text-end">
                    <h3 className="text-warning">Wallet: ₹{user.wallet_balance}</h3>
                </div>
            </div>

            {msg.text && (
                <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'} fade show`}>
                    {msg.text}
                </div>
            )}

            <div className="row">
                {/* Flight List Section */}
                <div className="col-md-8">
                    <h4 className="mb-4 border-bottom pb-2">Available Flights</h4>
                    {flights.map(f => (
                        <div key={f._id} className="card mb-3 border-0 shadow-sm hover-shadow">
                            <div className="card-body d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="mb-1 text-primary">{f.airline} <small className="text-muted">({f.flight_id})</small></h5>
                                    <p className="mb-0 fw-bold">{f.departure_city} ➔ {f.arrival_city}</p>
                                    {f.isSurge && (
                                        <span className="badge bg-danger animate-pulse">🔥 High Demand: 10% Surge Applied</span>
                                    )}
                                </div>
                                <div className="text-end">
                                    <h3 className="mb-2">₹{f.current_price}</h3>
                                    <button onClick={() => handleBook(f)} className="btn btn-success btn-lg px-4">Book Now</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Booking History Section */}
                <div className="col-md-4">
                    <h4 className="mb-4 border-bottom pb-2">Recent Bookings</h4>
                    <div className="list-group">
                        {user.bookings.length === 0 ? (
                            <p className="text-muted text-center p-4 bg-white rounded">No bookings yet.</p>
                        ) : (
                            user.bookings.slice().reverse().map((b, i) => (
                                <div key={i} className="list-group-item d-flex justify-content-between align-items-center shadow-sm mb-2 border-0">
                                    <div>
                                        <div className="fw-bold">{b.pnr}</div>
                                        <small className="text-muted">{b.airline}</small>
                                    </div>
                                    <button onClick={() => generatePDF(b)} className="btn btn-sm btn-outline-primary">Download PDF</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;