const mongoose = require('mongoose');

const AdminMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Depositer', 'Withdrawer', 'Support Admin', 'Manager'],
        required: true 
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminMember', AdminMemberSchema);