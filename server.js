
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;


app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/index.html")
})


app.post("/create-order", async (req, res) => {
  const orderId = "ORDER_" + Date.now();

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
  order_amount: 10,
  order_currency: "INR",
  customer_details: {
    customer_id: "cust_001",
    customer_phone: "9999999999"
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
