# Flight Booking System (MERN + AI)

A professional flight booking application built with the MERN stack, featuring dynamic surge pricing and an integrated AI Travel Assistant.

## Key Features
- **Dynamic Surge Pricing:** Implementation of demand-based pricing logic (10% hike after 3 attempts).
- **AI Travel Assistant:** Integrated Google Gemini AI to handle real-time user queries.
- **Wallet System:** Dedicated virtual wallet for seamless ticket booking.
- **E-Ticket Generation:** Instant PDF boarding pass generation using jsPDF.
- **Search & Filter:** Functional search bar with city and date filtering.

## Tech Stack
- **Frontend:** React.js, Bootstrap 5, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **AI:** Google Generative AI (Gemini API)

## Installation
1. Clone the repo: `git clone [git clone [https://github.com/asheshtiwari/flight-booking-system.git](https://github.com/asheshtiwari/flight-booking-system.git)
cd flight-booking-system]`
2. Install Backend dependencies: `cd backend && npm install`
3. Install Frontend dependencies: `cd frontend && npm install`
4. Create a `.env` file in the backend folder and add your `GEMINI_API_KEY`.
5. Start the project: `npm start`