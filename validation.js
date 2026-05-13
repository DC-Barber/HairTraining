// validation.js - English Error Messages for UI Compatibility
const Validator = {
    validate: function(user, pass, isRegister, phone, fullname) {
        // Username: 6 to 10 chars
        if (user.length < 6 || user.length > 10) {
            return "❌ Username must be 6-10 characters";
        }
        
        // Password: Letter + Number, 6 to 10 chars
        const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,10}$/;
        if (!passRegex.test(pass)) {
            return "❌ Password must be 6-10 characters with letters and numbers";
        }

        if (isRegister) {
            // Full Name: 3 to 20 chars
            if (!fullname || fullname.length < 3 || fullname.length > 20) {
                return "❌ Full name must be 3-20 characters";
            }
            // Phone: Exactly 9 digits
            const phoneRegex = /^\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return "❌ Phone number must be exactly 9 digits";
            }
        }
        return null;
    }
};