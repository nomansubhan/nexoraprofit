const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    packageId: { type: Number, required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: 'EasyPaisa' },
    accountHolder: { type: String, default: 'Nexora Official' },
    accountNumber: { type: String, default: '03258173385' },
    transactionId: { type: String, required: true, unique: true },
    screenshot: { type: String, default: null },
    status: { type: String, enum: ['Pending', 'Approved', 'Canceled'], default: 'Pending' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deposit', depositSchema);