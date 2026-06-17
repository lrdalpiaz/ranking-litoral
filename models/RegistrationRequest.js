const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema({
    existingUserId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    fullName: { type: String, required: true },
    nickname: { type: String, required: false, default: "" },
    email: { type: String, required: false, lowercase: true, trim: true, default: "" },
    phone: { type: String, required: true },
    intendedClass: { type: String, required: true, enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
    
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    requestedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RegistrationRequest', registrationRequestSchema);
