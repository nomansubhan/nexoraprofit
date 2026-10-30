const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    bankName: { type: String, required: true },
    accountTitle: { type: String, required: true },
    accountNumber: { type: String, required: true },
    logo: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['both', 'deposit', 'withdraw'], default: 'both' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bank', bankSchema);