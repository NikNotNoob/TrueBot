const mongoose = require('mongoose');

const RatioSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    good_reacts: {
        type: Number,
        required: true,
    },
    bad_reacts: {
        type: Number,
        required: true,
    }
});

module.exports = mongoose.model('Ratio', RatioSchema);