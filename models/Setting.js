const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    projectTitle: { type: String, default: 'NEXORA CAPITAL' },
    projectName: { type: String, default: 'Nexora Capital Official' },
    projectType: { type: String, default: 'Auto Earning' },
    whatsappHelpline: { type: String, default: '+923001234567' },
    whatsappGroupLink: { type: String, default: 'https://chat.whatsapp.com/' },
    whatsappChannelLink: { type: String, default: 'https://whatsapp.com/channel/' },
    fbrCertificate: { type: String, default: '' },
    secpCertificate: { type: String, default: '' },
    androidApk: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', settingSchema);