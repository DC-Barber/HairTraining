// validation.js
const Validator = {
    validate: function(user, pass, isRegister, phone, fullname) {
        // Username: 6 to 10 chars
        if (user.length < 6 || user.length > 10) {
            return "❌ Username သည် ၆ လုံးမှ ၁၀ လုံးအတွင်း ဖြစ်ရပါမည်။";
        }
        
        // Password: Letter + Number, 6 to 10 chars
        const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,10}$/;
        if (!passRegex.test(pass)) {
            return "❌ Password သည် ၆-၁၀ လုံးရှိရပြီး အက္ခရာနှင့် ဂဏန်း ရောပါရပါမည်။";
        }

        if (isRegister) {
            // Full Name: 3 to 20 chars
            if (!fullname || fullname.length < 3 || fullname.length > 20) {
                return "❌ နာမည်သည် ၃ လုံးမှ ၂၀ လုံးအတွင်း ရှိရပါမည်။";
            }
            // Phone: Exactly 9 digits
            const phoneRegex = /^\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return "❌ ဖုန်းနံပါတ်သည် ဂဏန်း ၉ လုံး အတိအကျ ဖြစ်ရပါမည်။";
            }
        }
        return null;
    }
};
