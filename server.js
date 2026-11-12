require("dotenv").config();

const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");

const app = express();

const PORT = Number(process.env.PORT || 3000);
let client;
const CONTACT_EMAIL = "vaishnavim0906@gmail.com";

let messages;
let server;
let mailer;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "script.js"));
});

app.post("/api/contact", async (req, res, next) => {
  try {
    const body = req.body || {};

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Please fill in all fields."
      });
    }

    if (
      name.length > 80 ||
      email.length > 254 ||
      message.length > 2000
    ) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (!process.env.SMTP_PASS) {
      return res.status(503).json({
        message: "Email is not configured yet. Add a Gmail app password to the .env file."
      });
    }

    await messages.insertOne({
      name,
      email,
      message,
      createdAt: new Date()
    });

    try {
      await mailer.sendMail({
        from: process.env.SMTP_USER || CONTACT_EMAIL,
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: "New message from your portfolio",
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`
      });
    } catch (error) {
      console.error("Contact email delivery failed:", error);
      return res.status(502).json({
        message: "Your message was saved, but the email could not be sent. Please try again later."
      });
    }

    return res.status(201).json({
      message: "Thank you! Your message was emailed and saved to MongoDB."
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);

  const status =
    error.type === "entity.too.large"
      ? 413
      : error.status === 400
        ? 400
        : 500;

  res.status(status).json({
    message:
      status === 413
        ? "Your request is too large."
        : status === 400
          ? "Invalid request data."
          : "Something went wrong. Please try again later."
  });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is required. Add your MongoDB connection string to the .env file."
      );
    }

    const smtpPort = Number(process.env.SMTP_PORT || 465);

    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      throw new Error("SMTP_PORT must be a valid port number.");
    }

    mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: (process.env.SMTP_SECURE || String(smtpPort === 465)) === "true",
      auth: {
        user: process.env.SMTP_USER || CONTACT_EMAIL,
        pass: process.env.SMTP_PASS || ""
      }
    });

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db(
      process.env.MONGODB_DB || "portfolioDB"
    );

    await db.command({ ping: 1 });
    messages = db.collection("messages");

    server = app.listen(PORT, () => {
      console.log(`Portfolio: http://localhost:${PORT}`);
      console.log(`MongoDB connected: ${db.databaseName}`);
    });
  } catch (error) {
    console.error("Could not start the application:", error.message);
    if (client) {
      await client.close();
    }
    process.exit(1);
  }
}

async function shutdown() {
  if (server) {
    server.close(async () => {
      if (client) {
        await client.close();
      }
      process.exit(0);
    });
  } else {
    if (client) {
      await client.close();
    }
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();