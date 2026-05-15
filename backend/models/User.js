const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide name'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },

    email:{
        type: String,
        required: [true, "Please provide email"],
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 50,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please provide a valid email',
          ],
          unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        minlength: 8,
        select: false
    },
    profileImage: {
        data: {
            type: Buffer,
            select: false,
        },
        mimeType: {
            type: String,
            default: "",
        },
    },
}, {
    timestamps: true
});

UserSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.password;
        if (ret.profileImage?.data) {
            delete ret.profileImage.data;
        }
        return ret;
    },
});

UserSchema.pre("save", async function(){
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})



UserSchema.methods.comparePassword = async function(candidatePassword){
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
}

module.exports = mongoose.model("User", UserSchema);
