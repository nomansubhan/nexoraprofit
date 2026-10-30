require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Models
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Deposit = require('./models/Deposit');
const Withdraw = require('./models/Withdraw');
const Bank = require('./models/Bank');
const Setting = require('./models/Setting');
const AdminMember = require('./models/AdminMember');
const packages = require('./models/Package');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer Upload Configuration
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session Store
app.use(session({
    secret: process.env.SESSION_SECRET || 'nexora_capital_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/auravest';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully to Nexora DB'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Global variables for templates
app.use(async (req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.user = req.session.user || null;
    res.locals.adminRole = req.session.adminRole || null;
    res.locals.adminUser = req.session.adminUser || null;
    try {
        res.locals.setting = await Setting.findOne() || null;
    } catch (e) {
        res.locals.setting = null;
    }
    next();
});

// Auth Guards & Professional 403 Error Responses
const isAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};
const isAuthenticated = isAuth;

const isAdmin = (req, res, next) => {
    if (req.session.isAdmin) return next();
    res.redirect('/admin/login');
};

const isSuperAdmin = (req, res, next) => {
    if (req.session.isAdmin && req.session.adminRole === 'Super Admin') return next();
    return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>403 - Access Denied</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .error-container { background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 420px; width: 100%; border-top: 4px solid #ef4444; }
                h1 { font-size: 56px; margin: 0 0 10px; color: #ef4444; font-weight: 800; }
                h3 { margin: 0 0 12px; font-size: 20px; color: #1e293b; }
                p { font-size: 14px; color: #64748b; margin-bottom: 25px; line-height: 1.5; }
                .btn-back { background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; transition: background 0.2s; }
                .btn-back:hover { background: #1e293b; }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h1>403</h1>
                <h3>Access Denied</h3>
                <p>Aapke paas is page ko access karne ki permission nahi hai. Yeh area sirf Super Admin ke liye restricted hai.</p>
                <a href="/admin/dashboard" class="btn-back">Wapas Dashboard Par Jayein</a>
            </div>
        </body>
        </html>
    `);
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session.isAdmin) return res.redirect('/admin/login');
        if (req.session.adminRole === 'Super Admin') return next();

        if (allowedRoles.includes(req.session.adminRole)) {
            return next();
        }
        return res.status(403).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>403 - Unauthorized Access</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .error-container { background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 420px; width: 100%; border-top: 4px solid #ef4444; }
                    h1 { font-size: 56px; margin: 0 0 10px; color: #ef4444; font-weight: 800; }
                    h3 { margin: 0 0 12px; font-size: 20px; color: #1e293b; }
                    p { font-size: 14px; color: #64748b; margin-bottom: 25px; line-height: 1.5; }
                    .btn-back { background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; transition: background 0.2s; }
                    .btn-back:hover { background: #1e293b; }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>403</h1>
                    <h3>Unauthorized Access</h3>
                    <p>Aapka current role is page ko dekhne ya manage karne ki ijazat nahi deta.</p>
                    <a href="/admin/dashboard" class="btn-back">Wapas Dashboard Par Jayein</a>
                </div>
            </body>
            </html>
        `);
    };
};

const AVAILABLE_BANKS = [
    { name: 'Allied Bank', logo: '/assets/allied-bank-limited-logo.png' },
    { name: 'Bank Alfalah', logo: '/assets/bank-alfalah-logo.png' },
    { name: 'EasyPaisa', logo: '/assets/Easypaisa-logo.png' },
    { name: 'Faysal Bank', logo: '/assets/faysal-bank-logo.png' },
    { name: 'HBL', logo: '/assets/HBL-logo.png' },
    { name: 'JazzCash', logo: '/assets/Jazzcash-logo.png' },
    { name: 'JS Bank', logo: '/assets/js-bank-logo.png' },
    { name: 'Khushhali Bank', logo: '/assets/Khushhali-bank-logo.png' },
    { name: 'Mashreq Bank', logo: '/assets/Mashreq-Bank-Logo.png' },
    { name: 'MCB', logo: '/assets/mcb-logo.png' },
    { name: 'Meezan Bank', logo: '/assets/meezan-bank-logo.png' },
    { name: 'NayaPay', logo: '/assets/nayapay-logo.png' },
    { name: 'SadaPay', logo: '/assets/SadaPay-Logo.png' },
    { name: 'UBL', logo: '/assets/UBL-Bank-Logo.png' },
    { name: 'UPaisa', logo: '/assets/Upaisa-Logo.png' }
];

// ================= USER ROUTES =================
app.get('/', async (req, res) => {
    if (req.session.user) {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }
        let setting = await Setting.findOne();
        return res.render('dashboard', { user, setting });
    }
    res.render('index');
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/signup', (req, res) => res.render('signup', { error: null, ref: req.query.ref || '' }));

app.post('/signup', async (req, res) => {
    const { username, phone, password, ref } = req.body;
    try {
        const existing = await User.findOne({ $or: [{ username }, { phone }] });
        if (existing) {
            return res.render('signup', { error: 'The username or mobile number already exists.', ref });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            phone,
            password: hashedPassword,
            referredBy: ref || null,
            balance: 0
        });
        req.session.user = { id: newUser._id, username: newUser.username };
        res.redirect('/');
    } catch (e) {
        res.render('signup', { error: 'Registration failed; please try again.', ref: '' });
    }
});

app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { error: 'Incorrect mobile number or password' });
        }
        req.session.user = { id: user._id, username: user.username };
        res.redirect('/');
    } catch (e) {
        res.render('login', { error: 'Login process failed' });
    }
});

app.get('/invest', isAuth, (req, res) => res.render('invest', { packages }));

app.get('/payment-method/:packageId', isAuth, async (req, res) => {
    try {
        const pkg = packages.find(p => p.id == req.params.packageId);
        if (!pkg) return res.redirect('/invest');
        const activeBanks = await Bank.find({ isActive: true, type: { $in: ['both', 'deposit'] } });
        res.render('payment-method', { pkg, activeBanks });
    } catch (err) {
        res.redirect('/invest');
    }
});

app.get('/payment-details/:packageId', isAuth, async (req, res) => {
    try {
        const pkg = packages.find(p => p.id == req.params.packageId);
        if (!pkg) return res.redirect('/invest');

        const bankId = req.query.bankId;
        const selectedBank = bankId ? await Bank.findById(bankId) : await Bank.findOne({ isActive: true, type: { $in: ['both', 'deposit'] } });

        if (!selectedBank) {
            return res.send('<h3 style="font-family:sans-serif; text-align:center; margin-top:50px;">Filhal koi deposit account active nahi hai.</h3>');
        }

        res.render('payment-details', { pkg, bank: selectedBank });
    } catch (err) {
        res.redirect('/invest');
    }
});

app.post('/submit-payment', isAuth, upload.single('screenshot'), async (req, res) => {
    try {
        const { packageId, transactionId, bankId } = req.body;
        console.log("Received Payment Data:", { packageId, transactionId, bankId });

        const pkg = packages.find(p => String(p.id) === String(packageId)) || { id: packageId || 1, price: 500 };
        const bank = bankId ? await Bank.findById(bankId) : null;

        const newDeposit = await Deposit.create({
            userId: req.session.user.id,
            username: req.session.user.username,
            packageId: pkg.id,
            amount: Number(pkg.price) || 500,
            method: bank ? bank.bankName : 'Direct Transfer',
            accountHolder: bank ? bank.accountTitle : 'Admin Account',
            accountNumber: bank ? bank.accountNumber : 'N/A',
            transactionId: transactionId || ('TID-' + Date.now()),
            screenshot: req.file ? '/uploads/' + req.file.filename : null,
            status: 'Pending'
        });

        console.log("Deposit Saved Successfully ID:", newDeposit._id);
        return res.redirect('/payment-status');
    } catch (err) {
        console.error('Payment Submission Critical Error:', err);
        return res.redirect('/invest');
    }
});

app.get('/payment-status', isAuth, (req, res) => res.render('payment-status'));

app.get('/deposit-history', isAuth, async (req, res) => {
    const deposits = await Deposit.find({ userId: req.session.user.id }).sort({ date: -1 });
    const approvedTotal = deposits.filter(d => d.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);
    const approvedCount = deposits.filter(d => d.status === 'Approved').length;
    const pendingCount = deposits.filter(d => d.status === 'Pending').length;
    res.render('deposit-history', { deposits, approvedTotal, approvedCount, pendingCount });
});

app.get('/withdraw', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const activeBanks = await Bank.find({ isActive: true, type: { $in: ['both', 'withdraw'] } });
        res.render('withdraw', { user, activeBanks, error: null, success: null });
    } catch (err) {
        res.redirect('/');
    }
});

app.post('/withdraw', isAuth, async (req, res) => {
    try {
        const { amount, method, accountTitle, accountNumber } = req.body;
        console.log("Withdrawal Form Data Received:", { amount, method, accountTitle, accountNumber });

        const withdrawAmount = Number(amount);
        const user = await User.findById(req.session.user.id);
        const activeBanks = await Bank.find({ isActive: true, type: { $in: ['both', 'withdraw'] } });

        if (!user) {
            return res.redirect('/login');
        }

        if (withdrawAmount < 60) {
            return res.render('withdraw', { user, activeBanks, error: 'The minimum withdrawal amount is Rs. 60!', success: null });
        }

        if (user.balance < withdrawAmount) {
            return res.render('withdraw', { user, activeBanks, error: 'There is not enough balance in your account!', success: null });
        }

        // Balance deduct karein
        user.balance -= withdrawAmount;
        await user.save();

        // Withdraw request create karein
        const newWithdraw = await Withdraw.create({
            userId: user._id,
            username: user.username,
            amount: withdrawAmount,
            method: method || 'EasyPaisa',
            accountTitle: accountTitle || user.username,
            accountNumber: accountNumber || 'N/A',
            status: 'Pending'
        });

        console.log("Withdrawal Request Created Successfully ID:", newWithdraw._id);

        return res.render('withdraw', { user, activeBanks, error: null, success: 'Withdrawal request successfully submit ho chuki hai!' });
    } catch (err) {
        console.error('CRITICAL WITHDRAWAL ERROR:', err);
        const user = await User.findById(req.session.user.id).catch(() => null);
        const activeBanks = await Bank.find({ isActive: true, type: { $in: ['both', 'withdraw'] } }).catch(() => []);
        return res.render('withdraw', { user, activeBanks, error: 'Failed: ' + err.message, success: null });
    }
});


app.get('/withdraw-history', isAuth, async (req, res) => {
    const withdrawals = await Withdraw.find({ userId: req.session.user.id }).sort({ date: -1 });
    res.render('withdraw-history', { withdrawals });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ================= ADMIN PANEL ROUTES =================

app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: null });
});

app.post('/admin/login', async (req, res) => {
    const rawUsername = (req.body.username || '').trim();
    const rawPassword = (req.body.password || '').trim();
    const rawRole = (req.body.role || 'Super Admin').trim();

    try {
        if (rawRole.toLowerCase() === 'super admin' || rawUsername.toLowerCase() === 'admin') {
            if (rawUsername === 'admin' && rawPassword === 'admin123') {
                req.session.isAdmin = true;
                req.session.adminRole = 'Super Admin';
                req.session.adminUser = 'Super Admin';
                return res.redirect('/admin/dashboard');
            }
            return res.render('admin-login', { error: 'Invalid Super Admin credentials' });
        }

        const member = await AdminMember.findOne({
            username: { $regex: new RegExp(`^${rawUsername}$`, 'i') }
        });

        if (!member) {
            return res.render('admin-login', { error: `User "${rawUsername}" team members mein exist nahi karta!` });
        }

        if (member.role.toLowerCase() !== rawRole.toLowerCase()) {
            return res.render('admin-login', { error: `Aapka account "${member.role}" role ke liye hai. Sahi role select karein!` });
        }

        if (!member.isActive) {
            return res.render('admin-login', { error: 'this account is blocked' });
        }

        const isMatch = await bcrypt.compare(rawPassword, member.password);
        if (!isMatch) {
            return res.render('admin-login', { error: 'Incorrect Password' });
        }

        req.session.isAdmin = true;
        req.session.adminRole = member.role;
        req.session.adminUser = member.name;

        const roleLower = member.role.toLowerCase();
        if (roleLower === 'depositer') {
            return res.redirect('/admin/deposits');
        } else if (roleLower === 'withdrawer') {
            return res.redirect('/admin/withdrawals');
        } else if (roleLower === 'manager') {
            return res.redirect('/admin/users');
        }

        res.redirect('/admin/dashboard');

    } catch (err) {
        res.render('admin-login', { error: 'System error: ' + err.message });
    }
});

app.get('/admin/dashboard', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        const deposits = await Deposit.find().sort({ date: -1 });
        const withdrawals = await Withdraw.find().sort({ date: -1 });

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const totalMembers = users.length;
        const totalMemberBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
        const todayJoined = users.filter(u => new Date(u.createdAt || Date.now()) >= startOfToday);

        const pendingDeposits = deposits.filter(d => d.status === 'Pending');
        const approvedDeposits = deposits.filter(d => d.status === 'Approved');
        const canceledDeposits = deposits.filter(d => d.status === 'Canceled');
        const pendingDepositAmount = pendingDeposits.reduce((acc, d) => acc + d.amount, 0);
        const todayDepositsList = approvedDeposits.filter(d => new Date(d.date) >= startOfToday);
        const todayDepositsAmount = todayDepositsList.reduce((acc, d) => acc + d.amount, 0);

        const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending');
        const approvedWithdrawals = withdrawals.filter(w => w.status === 'Approved');
        const rejectedWithdrawals = withdrawals.filter(w => w.status === 'Rejected');
        const pendingWithdrawAmount = pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0);
        const todayWithdrawalsList = approvedWithdrawals.filter(w => new Date(w.date) >= startOfToday);
        const todayWithdrawAmount = todayWithdrawalsList.reduce((acc, w) => acc + w.amount, 0);

        const stats = {
            totalMembers,
            totalMemberBalance,
            todayJoinedCount: todayJoined.length,
            todayJoinedBalance: todayJoined.reduce((acc, u) => acc + (u.balance || 0), 0),
            activeMembers: users.filter(u => (u.balance || 0) > 0).length,
            activeMemberBalance: users.filter(u => (u.balance || 0) > 0).reduce((acc, u) => acc + (u.balance || 0), 0),
            suspendedMembers: 0,
            suspendedMemberBalance: 0,
            pendingDepositAmount,
            pendingDepositRequests: pendingDeposits.length,
            todayDepositsAmount,
            todayActivePlans: todayDepositsList.length,
            totalActivePlans: approvedDeposits.length,
            canceledDepositsAmount: canceledDeposits.reduce((acc, d) => acc + d.amount, 0),
            canceledDepositRequests: canceledDeposits.length,
            pendingWithdrawAmount,
            pendingWithdrawRequests: pendingWithdrawals.length,
            todayWithdrawAmount,
            todayWithdrawRequests: todayWithdrawalsList.length,
            rejectedWithdrawAmount: rejectedWithdrawals.reduce((acc, w) => acc + w.amount, 0),
            canceledWithdrawRequests: rejectedWithdrawals.length,

            totalProfit: approvedDeposits.reduce((acc, d) => acc + (d.amount * 0.1), 0),
            todayProfit: todayDepositsAmount * 0.1,
            todayProfitGenerated: todayDepositsAmount * 0.15,
            nextDayEarning: 0,

            totalReferrals: 0,
            activeReferrals: 0,
            totalReferralDeposits: 0,
            referralCommission: 0,

            tasksPending: 0,
            completedTasks: 0,
            totalTasks: 0,
            totalTaskAmount: 0,
            pendingSalaryRewards: 0,
            totalSalaryReward: 0,

            todayExpenses: 0,
            totalExpenses: 0
        };

        res.render('admin-dashboard', { stats, deposits, withdrawals, pendingDeposits, pendingWithdrawals });
    } catch (err) {
        res.send('Dashboard error: ' + err.message);
    }
});

app.get('/admin/deposits', checkRole(['Super Admin', 'Depositer']), async (req, res) => {
    const deposits = await Deposit.find().sort({ date: -1 });
    if (req.session.adminRole === 'Depositer') {
        return res.render('admin-depositer-dashboard', { deposits });
    }
    res.render('admin-deposits', { deposits });
});

app.post('/admin/deposits/approve/:id', checkRole(['Super Admin', 'Depositer']), async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (deposit && deposit.status === 'Pending') {
            deposit.status = 'Approved';
            await deposit.save();
            await User.findByIdAndUpdate(deposit.userId, { $inc: { balance: deposit.amount } });
        }
        res.redirect(req.session.adminRole === 'Depositer' ? '/admin/deposits' : '/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/deposits/cancel/:id', checkRole(['Super Admin', 'Depositer']), async (req, res) => {
    try {
        await Deposit.findByIdAndUpdate(req.params.id, { status: 'Canceled' });
        res.redirect(req.session.adminRole === 'Depositer' ? '/admin/deposits' : '/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.get('/admin/withdrawals', checkRole(['Super Admin', 'Withdrawer']), async (req, res) => {
    const withdrawals = await Withdraw.find().sort({ date: -1 });
    res.render('admin-withdrawals', { withdrawals });
});

app.post('/admin/withdrawals/approve/:id', checkRole(['Super Admin', 'Withdrawer']), async (req, res) => {
    try {
        await Withdraw.findByIdAndUpdate(req.params.id, { status: 'Approved' });
        res.redirect('/admin/withdrawals');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/withdrawals/reject/:id', checkRole(['Super Admin', 'Withdrawer']), async (req, res) => {
    try {
        const withdraw = await Withdraw.findById(req.params.id);
        if (withdraw && withdraw.status === 'Pending') {
            withdraw.status = 'Rejected';
            await withdraw.save();
            await User.findByIdAndUpdate(withdraw.userId, { $inc: { balance: withdraw.amount } });
        }
        res.redirect('/admin/withdrawals');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.get('/admin/banks', isSuperAdmin, async (req, res) => {
    const banks = await Bank.find().sort({ createdAt: -1 });
    res.render('admin-banks', { banks, availableBanks: AVAILABLE_BANKS });
});

app.post('/admin/banks/add', isSuperAdmin, async (req, res) => {
    try {
        const { bankName, accountTitle, accountNumber, type } = req.body;
        const selectedBank = AVAILABLE_BANKS.find(b => b.name === bankName);
        const logo = selectedBank ? selectedBank.logo : '/assets/Easypaisa-logo.png';
        await Bank.create({ bankName, accountTitle, accountNumber, logo, type: type || 'both', isActive: true });
        res.redirect('/admin/banks');
    } catch (err) { res.redirect('/admin/banks'); }
});

app.post('/admin/banks/toggle/:id', isSuperAdmin, async (req, res) => {
    try {
        const bank = await Bank.findById(req.params.id);
        if (bank) { bank.isActive = !bank.isActive; await bank.save(); }
        res.redirect('/admin/banks');
    } catch (err) { res.redirect('/admin/banks'); }
});

app.post('/admin/banks/delete/:id', isSuperAdmin, async (req, res) => {
    try { await Bank.findByIdAndDelete(req.params.id); res.redirect('/admin/banks'); }
    catch (err) { res.redirect('/admin/banks'); }
});

const settingUpload = upload.fields([
    { name: 'fbrCertificate', maxCount: 1 },
    { name: 'secpCertificate', maxCount: 1 },
    { name: 'androidApk', maxCount: 1 }
]);

app.get('/admin/settings', isAdmin, async (req, res) => {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    res.render('admin-settings', { setting, success: req.query.saved ? true : false });
});

app.post('/admin/settings', isAdmin, settingUpload, async (req, res) => {
    let setting = await Setting.findOne();
    if (!setting) setting = new Setting();
    setting.projectTitle = req.body.projectTitle;
    setting.projectName = req.body.projectName;
    setting.projectType = req.body.projectType;
    setting.whatsappHelpline = req.body.whatsappHelpline;
    setting.whatsappGroupLink = req.body.whatsappGroupLink;
    setting.whatsappChannelLink = req.body.whatsappChannelLink;

    if (req.files && req.files['fbrCertificate']) setting.fbrCertificate = '/uploads/' + req.files['fbrCertificate'][0].filename;
    if (req.files && req.files['secpCertificate']) setting.secpCertificate = '/uploads/' + req.files['secpCertificate'][0].filename;
    if (req.files && req.files['androidApk']) setting.androidApk = '/uploads/' + req.files['androidApk'][0].filename;

    await setting.save();
    res.redirect('/admin/settings?saved=true');
});

app.get('/admin/users', checkRole(['Super Admin', 'Manager']), async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin-users', { users });
});

app.get('/admin/users/switch/:id', isSuperAdmin, async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) { req.session.user = { id: user._id, username: user.username }; return res.redirect('/'); }
    res.redirect('/admin/users');
});

app.post('/admin/users/delete/:id', isSuperAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/users');
});

app.get('/admin/team', isSuperAdmin, async (req, res) => {
    const members = await AdminMember.find().sort({ createdAt: -1 });
    res.render('admin-team', { members, error: null });
});

app.post('/admin/team/add', isSuperAdmin, async (req, res) => {
    try {
        const { name, username, password, role } = req.body;
        const cleanUser = (username || '').trim().toLowerCase();
        const existing = await AdminMember.findOne({ username: cleanUser });
        if (existing) {
            const members = await AdminMember.find().sort({ createdAt: -1 });
            return res.render('admin-team', { members, error: 'Username already exists!' });
        }
        const hashedPassword = await bcrypt.hash((password || '').trim(), 10);
        await AdminMember.create({
            name: (name || '').trim(),
            username: cleanUser,
            password: hashedPassword,
            role: (role || 'Depositer').trim(),
            isActive: true
        });
        res.redirect('/admin/team');
    } catch (err) { res.redirect('/admin/team'); }
});

app.post('/admin/team/toggle/:id', isSuperAdmin, async (req, res) => {
    const member = await AdminMember.findById(req.params.id);
    if (member) { member.isActive = !member.isActive; await member.save(); }
    res.redirect('/admin/team');
});

app.post('/admin/team/delete/:id', isSuperAdmin, async (req, res) => {
    await AdminMember.findByIdAndDelete(req.params.id);
    res.redirect('/admin/team');
});

app.post('/admin/reset-panel', isSuperAdmin, async (req, res) => {
    await Deposit.deleteMany({});
    await Withdraw.deleteMany({});
    await Transaction.deleteMany({});
    await Bank.deleteMany({});
    await AdminMember.deleteMany({});
    await User.deleteMany({});
    res.redirect('/admin/dashboard');
});

app.post('/admin/settings/delete/:type', isAdmin, async (req, res) => {
    try {
        const setting = await Setting.findOne();
        if (setting) {
            const fileType = req.params.type;
            const fieldMap = {
                fbr: 'fbrCertificate',
                secp: 'secpCertificate',
                apk: 'androidApk'
            };
            const field = fieldMap[fileType];

            if (field && setting[field]) {
                const filePath = path.join(__dirname, setting[field]);
                fs.unlink(filePath, (err) => {
                    if (err) console.log('File delete skip:', err.message);
                });
                setting[field] = '';
                await setting.save();
            }
        }
        res.redirect('/admin/settings');
    } catch (err) {
        console.error('Delete error:', err);
        res.redirect('/admin/settings');
    }
});

app.get('/rewards', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const setting = await Setting.findOne();
        res.render('rewards', { user, setting });
    } catch (err) {
        res.redirect('/dashboard');
    }
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const setting = await Setting.findOne();
        res.render('dashboard', { user, setting });
    } catch (err) {
        res.redirect('/');
    }
});

app.get('/team', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        const keys = [user.username, user.phone, String(user._id)].filter(Boolean);
        const members = await User.find({ referredBy: { $in: keys } }).sort({ createdAt: -1 });

        let teamInvestment = 0;
        if (members.length) {
            const ids = members.map(m => m._id);
            const deposits = await Deposit.find({ userId: { $in: ids }, status: 'Approved' });
            teamInvestment = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        }

        const referralCommission = user.referralEarnings || 0;

        res.render('team', {
            user,
            members,
            totalMembers: members.length,
            level1Count: members.length,
            teamInvestment,
            referralCommission
        });
    } catch (err) {
        console.error('Team error:', err);
        res.redirect('/');
    }
});

// Profile / Personal Info Route
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const setting = await Setting.findOne();
        res.render('profile', { user, setting });
    } catch (err) {
        res.redirect('/');
    }
});

app.get('/earnings', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        const deposits = await Deposit.find({ userId: user._id, status: 'Approved' });
        const totalInvested = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);

        let transactions = [];
        try {
            transactions = await Transaction.find({
                $or: [{ user: user._id }, { userId: user._id }]
            }).sort({ createdAt: -1 }).limit(50).lean();
        } catch (e) {
            console.log('Transactions skip:', e.message);
        }

        res.render('earnings', {
            user,
            balance: user.balance || 0,
            totalInvested,
            referralCommission: user.referralEarnings || 0,
            transactions
        });
    } catch (err) {
        console.error('Earnings error:', err);
        res.redirect('/');
    }
});

// 1. My Profile Info Route
app.get('/my-info', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('my-info', { user });
    } catch (err) {
        res.redirect('/profile');
    }
});

// 2. Change Password Page Route
app.get('/change-password', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('change-password', { user, message: null, error: null });
    } catch (err) {
        res.redirect('/profile');
    }
});

// 3. Change Password Post Route
app.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const dbUser = await User.findById(req.session.user.id);

        const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
        if (!isMatch) {
            return res.render('change-password', { user: dbUser, error: 'Current password is incorrect', message: null });
        }

        dbUser.password = await bcrypt.hash(newPassword, 10);
        await dbUser.save();
        res.render('change-password', { user: dbUser, message: 'Password changed successfully!', error: null });
    } catch (err) {
        const user = await User.findById(req.session.user.id);
        res.render('change-password', { user, error: 'Something went wrong; please try again.', message: null });
    }
});

// 4. FBR & SECP Info Route (Admin settings se images uthayega)
app.get('/fbr-info', isAuthenticated, async (req, res) => {
    try {
        const setting = await Setting.findOne();
        res.render('fbr-info', { setting });
    } catch (err) {
        res.redirect('/profile');
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => { res.redirect('/admin/login'); });
});

app.listen(PORT, () => {
    console.log(`Nexora Capital Server running on http://localhost:${PORT}`);
});