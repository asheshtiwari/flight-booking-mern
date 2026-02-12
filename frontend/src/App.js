import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API = "http://localhost:5000/api";

function App() {
    const [flights, setFlights] = useState([]);
    const [user, setUser] = useState({ wallet_balance: 0, bookings: [] });
    const [msg, setMsg] = useState({ text: "", type: "" });
    
    //  inputs for search
    const [searchQuery, setSearchQuery] = useState({ 
        fromCity: "", 
        toCity: "", 
        travelDate: "" 
    });

    const loadDashboardData = async () => {
        try {
            // total flights are shown on normal search
            const fRes = await axios.get(`${API}/flights`);
            const uRes = await axios.get(`${API}/user`);
            setFlights(fRes.data);
            setUser(uRes.data);
        } catch (err) {
            console.error("Data fetching failed:", err);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // --- Search Logic ---
    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        try {
            // Backend search route call 
            const res = await axios.get(`${API}/flights?from=${searchQuery.fromCity}&to=${searchQuery.toCity}`);
            setFlights(res.data);
            console.log("Results found:", res.data.length);
        } catch (err) {
            setMsg({ text: "Search failed. Please try again.", type: "error" });
        }
    };

    const handleBook = async (flight) => {
        try {
            // Log attempt for surge pricing logic
            await axios.post(`${API}/log-attempt/${flight._id}`);
            
            const res = await axios.post(`${API}/book`, {
                flightId: flight.flight_id,
                airline: flight.airline,
                price: flight.current_price,
                route: `${flight.departure_city} -> ${flight.arrival_city}`
            });

            setMsg({ text: "Ticket Booked! PNR: " + res.data.booking.pnr, type: "success" });
            generatePDF(res.data.booking);
            loadDashboardData(); 
        } catch (err) {
            setMsg({ 
                text: err.response?.data?.message || "Something went wrong!", 
                type: "error" 
            });
            loadDashboardData(); 
        }
    };

    const generatePDF = (b) => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("XTECHON TRAVELS - BOARDING PASS", 20, 20);
        doc.setFont("helvetica", "normal");
        doc.line(20, 25, 190, 25);
        doc.text(`PNR: ${b.pnr}`, 20, 40);
        doc.text(`Flight: ${b.airline}`, 20, 50);
        doc.text(`Route: ${b.route}`, 20, 60);
        doc.text(`Price: Rs. ${b.amount_paid}`, 20, 70);
        doc.text(`Status: CONFIRMED`, 20, 80);
        doc.save(`Ticket_${b.pnr}.pdf`);
    };

    return (
        <div className="container mt-5 py-4 shadow-sm rounded bg-white border">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            
            <div className="row align-items-center bg-primary text-white p-4 rounded-3 mb-4 mx-1">
                <div className="col-md-7">
                    <h1 className="h2 mb-0"> TravelPortal Dashboard</h1>
                </div>
                <div className="col-md-5 text-end">
                    <span className="fs-5">Balance: ₹{user.wallet_balance}</span>
                </div>
            </div>

            {/* --- Search & Calendar UI --- */}
            <div className="card border-0 bg-light p-4 mb-5 shadow-sm">
                <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Departure</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Mumbai"
                            onChange={(e) => setSearchQuery({...searchQuery, fromCity: e.target.value})}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Arrival</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Delhi"
                            onChange={(e) => setSearchQuery({...searchQuery, toCity: e.target.value})}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Date</label>
                        <input 
                            type="date" 
                            className="form-control" 
                            onChange={(e) => setSearchQuery({...searchQuery, travelDate: e.target.value})}
                        />
                    </div>
                    <div className="col-md-3">
                        <button type="submit" className="btn btn-dark w-100">Find Flights</button>
                    </div>
                </form>
            </div>

            {msg.text && (
                <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'} mx-1`}>
                    {msg.text}
                </div>
            )}

            <div className="row mt-4">
                <div className="col-md-8">
                    <h5 className="mb-4">Available Options</h5>
                    {flights.length === 0 ? <p className="text-center p-5">No flights found matching your search.</p> : 
                        flights.map(f => (
                            <div key={f._id} className="card mb-3 border-light shadow-sm">
                                <div className="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="mb-1 text-uppercase text-primary">{f.airline}</h6>
                                        <p className="mb-0">{f.departure_city} ➔ {f.arrival_city}</p>
                                        {f.isSurge && (
                                            <span className="badge bg-warning text-dark mt-2">⚡ Surge Pricing Applied</span>
                                        )}
                                    </div>
                                    <div className="text-end">
                                        <h4 className="mb-2 text-dark">₹{f.current_price}</h4>
                                        <button onClick={() => handleBook(f)} className="btn btn-outline-success">Book Ticket</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>

                <div className="col-md-4">
                    <h5 className="mb-4">My Bookings</h5>
                    <div className="list-group list-group-flush border rounded">
                        {user.bookings.length === 0 ? (
                            <p className="p-3 text-center text-muted">No history found.</p>
                        ) : (
                            user.bookings.slice().reverse().map((b, i) => (
                                <div key={i} className="list-group-item d-flex justify-content-between align-items-center py-3">
                                    <div>
                                        <div className="small fw-bold">{b.pnr}</div>
                                        <div className="text-muted extra-small">{b.airline}</div>
                                    </div>
                                    <button onClick={() => generatePDF(b)} className="btn btn-sm btn-link text-decoration-none">PDF</button>
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