const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://edusphere-eductionalproject-5e95f1.netlify.app'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully!'))
    .catch((err) => console.error('❌ MongoDB Error:', err.message));

const Enquiry = require('./src/models/Enquiry');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporter.verify()
    .then(() => console.log('✅ SMTP connection successful'))
    .catch((error) => console.error('❌ SMTP connection failed:', error.message));

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ EduSphere API is working!' });
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactInput(body) {
    const errors = [];
    const { name, email, subject, message } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
        errors.push('Name is required.');
    } else if (name.trim().length < 2 || name.trim().length > 80) {
        errors.push('Name must be between 2 and 80 characters.');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
        errors.push('Email is required.');
    } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.push('Please provide a valid email address.');
    }

    if (subject && (typeof subject !== 'string' || subject.trim().length > 120)) {
        errors.push('Subject cannot exceed 120 characters.');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
        errors.push('Message is required.');
    } else if (message.trim().length < 10 || message.trim().length > 1000) {
        errors.push('Message must be between 10 and 1000 characters.');
    }

    return errors;
}

app.post('/api/contact', async (req, res) => {
    try {
        const errors = validateContactInput(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const { name, email, subject, message } = req.body;

        const enquiry = new Enquiry({
            name: name.trim(),
            email: email.trim(),
            subject: subject ? subject.trim() : 'General Inquiry',
            message: message.trim()
        });
        await enquiry.save();

        try {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: process.env.CONTACT_RECEIVER,
                replyTo: enquiry.email,
                subject: `New EduSphere Enquiry — ${enquiry.subject}`,
                text: `Name: ${enquiry.name}\nEmail: ${enquiry.email}\nSubject: ${enquiry.subject}\n\nMessage:\n${enquiry.message}`
            });
        } catch (mailErr) {
            console.error('⚠️ SMTP send failed:', mailErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
            data: { id: enquiry._id }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        console.error('❌ Contact error:', err.message);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
});

app.get('/api/contact', async (req, res) => {
    try {
        const messages = await Enquiry.find().sort({ createdAt: -1 });
        res.json({ success: true, count: messages.length, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});