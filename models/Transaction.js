const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    identifier: { type: String, required: true }, // e.g. "muh***" or "0300*****"
    amount: { type: Number, required: true },
    status: { type: String, default: 'approved' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);