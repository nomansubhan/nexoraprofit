const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        required: true
        // Note: Yahan se 'enum' hata diya gaya hai taake koi bhi bank/wallet string save ho sakay.
    },
    accountTitle: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Canceled'],
        default: 'Pending'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Withdraw', withdrawSchema);