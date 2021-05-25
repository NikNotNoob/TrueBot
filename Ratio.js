const mongoose = require('mongoose');

const RatioSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    good_reacts: {
        type: String,
        required: true,
    },
    bad_reacts: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Ratio', RatioSchema);