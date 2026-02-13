import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API = "http://localhost:5000/api";

function App() {
    const [flights, setFlights] = useState([]);
    const [user, setUser] = useState({ wallet_balance: 0, bookings: [] });
    const [msg, setMsg] = useState({ text: "", type: "" });
    
    // Inputs for search
    const [searchQuery, setSearchQuery] = useState({ 
        fromCity: "", 
        toCity: "", 
        travelDate: "" 
    });

    // AI Chatbot State
    const [chatInput, setChatInput] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const loadDashboardData = async () => {
        try {
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

    // --- AI Chat Logic ---
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = { role: "user", text: chatInput };
        setChatLog(prev => [...prev, userMsg]);
        const currentInput = chatInput;
        setChatInput("");

        try {
            const res = await axios.post(`${API}/chat`, { message: currentInput });
            setChatLog(prev => [...prev, { role: "bot", text: res.data.reply }]);
        } catch (err) {
            setChatLog(prev => [...prev, { role: "bot", text: "AI Service is temporarily unavailable." }]);
        }
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.get(`${API}/flights?from=${searchQuery.fromCity}&to=${searchQuery.toCity}`);
            setFlights(res.data);
        } catch (err) {
            setMsg({ text: "Search failed. Please try again.", type: "error" });
        }
    };

    const handleBook = async (flight) => {
        try {
            await axios.post(`${API}/log-attempt/${flight._id}`);
            const res = await axios.post(`${API}/book`, {
                flightId: flight.flight_id,
                airline: flight.airline,
                price: flight.current_price,
                route: `${flight.departure_city} to ${flight.arrival_city}`
            });
            setMsg({ text: "Ticket Booked successfully. PNR: " + res.data.booking.pnr, type: "success" });
            generatePDF(res.data.booking);
            loadDashboardData(); 
        } catch (err) {
            setMsg({ text: err.response?.data?.message || "Something went wrong!", type: "error" });
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
        <div className="container mt-5 py-4 shadow-sm rounded bg-white border position-relative">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            
            <div className="row align-items-center bg-primary text-white p-4 rounded-3 mb-4 mx-1">
                <div className="col-md-7">
                    <h1 className="h2 mb-0">TravelPortal Dashboard</h1>
                </div>
                <div className="col-md-5 text-end">
                    <span className="fs-5">Wallet Balance: Rs. {user.wallet_balance}</span>
                </div>
            </div>

            <div className="card border-0 bg-light p-4 mb-5 shadow-sm">
                <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Departure City</label>
                        <input type="text" className="form-control" placeholder="Mumbai" onChange={(e) => setSearchQuery({...searchQuery, fromCity: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Arrival City</label>
                        <input type="text" className="form-control" placeholder="Delhi" onChange={(e) => setSearchQuery({...searchQuery, toCity: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Date of Travel</label>
                        <input type="date" className="form-control" onChange={(e) => setSearchQuery({...searchQuery, travelDate: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <button type="submit" className="btn btn-dark w-100">Find Flights</button>
                    </div>
                </form>
            </div>

            {msg.text && <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'} mx-1`}>{msg.text}</div>}

            <div className="row mt-4">
                <div className="col-md-8">
                    <h5 className="mb-4">Available Flight Options</h5>
                    {flights.length === 0 ? <p className="text-center p-5">No flights found matching your criteria.</p> : 
                        flights.map(f => (
                            <div key={f._id} className="card mb-3 border-light shadow-sm">
                                <div className="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="mb-1 text-uppercase text-primary">{f.airline}</h6>
                                        <p className="mb-0">{f.departure_city} to {f.arrival_city}</p>
                                        {f.isSurge && <span className="badge bg-warning text-dark mt-2">High Demand Surge Applied</span>}
                                    </div>
                                    <div className="text-end">
                                        <h4 className="mb-2 text-dark">Rs. {f.current_price}</h4>
                                        <button onClick={() => handleBook(f)} className="btn btn-outline-success">Book Ticket</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>

                <div className="col-md-4">
                    <h5 className="mb-4">Booking History</h5>
                    <div className="list-group list-group-flush border rounded">
                        {user.bookings.length === 0 ? <p className="p-3 text-center text-muted">No recent bookings.</p> : 
                            user.bookings.slice().reverse().map((b, i) => (
                                <div key={i} className="list-group-item d-flex justify-content-between align-items-center py-3">
                                    <div>
                                        <div className="small fw-bold">PNR: {b.pnr}</div>
                                        <div className="text-muted extra-small">{b.airline}</div>
                                    </div>
                                    <button onClick={() => generatePDF(b)} className="btn btn-sm btn-link text-decoration-none">Download PDF</button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* --- AI Chatbot UI --- */}
            <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
                {isChatOpen ? (
                    <div className="card shadow-lg border-0" style={{ width: '350px' }}>
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <span className="fw-bold">AI Travel Assistant</span>
                            <button className="btn-close btn-close-white" onClick={() => setIsChatOpen(false)}></button>
                        </div>
                        <div className="card-body overflow-auto bg-light" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                            {chatLog.length === 0 && <p className="text-muted text-center my-auto small">Welcome. Ask about flights or pricing.</p>}
                            {chatLog.map((chat, index) => (
                                <div key={index} className={`mb-3 ${chat.role === 'user' ? 'text-end' : 'text-start'}`}>
                                    <div className={`d-inline-block px-3 py-2 rounded-3 shadow-sm ${chat.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ maxWidth: '80%', fontSize: '0.9rem' }}>
                                        {chat.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleChatSubmit} className="p-2 border-top bg-white">
                            <div className="input-group">
                                <input type="text" className="form-control form-control-sm border-0 bg-light" placeholder="Type a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                                <button className="btn btn-primary btn-sm" type="submit">Send Message</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <button className="btn btn-primary rounded shadow-lg px-4 py-2" onClick={() => setIsChatOpen(true)}>
                        Open Help Chat
                    </button>
                )}
            </div>
        </div>
    );
}

export default App;