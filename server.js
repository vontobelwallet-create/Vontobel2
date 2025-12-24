
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongo");


const app = express();

app.use(cors({
  origin: "https://vontobelwallet-create.github.io",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


app.use(express.json());

app.use(session({
  name: "vontobel.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 60 * 60 * 24 * 7 // ✅ 7 DAYS
  }),

  cookie: {
    secure: true,        // Required on HTTPS (Render)
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7 // ✅ 7 DAYS (milliseconds)
  }
}));


const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;




//Mongo
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);
let usersCollection;

async function connectDB() {
  await client.connect();
  const db = client.db("Customers"); // ✅ DB NAME
  usersCollection = db.collection("users"); // ✅ COLLECTION
  console.log("MongoDB Connected");
}

connectDB();








app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/index.html")
})

app.get("/user_info", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.json({
    userId: req.session.user.id,
    balance: req.session.user.balance 
  });
});





app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = {
      name,
      email,
      phone,
      password, // ⚠️ plaintext for now (hash later)
      balance: 0,
      trans: [],
      createdAt: new Date()
    };

    await usersCollection.insertOne(newUser);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});



app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Password check (plaintext for now)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Create session
  req.session.user = {
  id: user._id,
  email: user.email,
  phone: user.phone,   
  balance: user.balance
};


    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});



app.post("/create-order", async (req, res) => {
  const orderId = "ORDER_" + Date.now();
const amount = Number(req.body.amount);

  try {
    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET
      },
body: JSON.stringify({
  order_id: orderId,
  order_amount: amount,
  order_currency: "INR",
  customer_details: {
  customer_id: req.session.user.id.toString(),   
  customer_phone: req.session.user.phone
  },
  order_meta: {
    return_url: "https://vontobel2.onrender.com/payment-result?order_id={order_id}"
  }
})

    });

    const data = await response.json();
    console.log(data)
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Order creation failed" });
  }
});


app.get("/payment-result", async (req, res) => {
  const orderId = req.query.order_id;

  res.send(`
    <html>
      <body style="font-family:Arial;text-align:center;padding:40px">
        <h2>Processing Payment...</h2>
        <script>
          window.location.href = "https://vontobelwallet-create.github.io/Vontobel_Ledge/dashboard.html?order_id=${orderId}";
        </script>
      </body>
    </html>
  `);
});


app.get("/verify-payment/:orderId", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const response = await fetch(
      `https://api.cashfree.com/pg/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

