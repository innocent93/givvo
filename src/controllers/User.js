// // @ts-nocheck
// import mongoose from "mongoose";
// import crypto from "crypto"
// import bcrypt from "bcryptjs"

// const userSchema = mongoose.Schema(
// 	{
// 		firstName: {
// 			type: String,
// 			required: true,
// 		},
// 		lastName:
// 		 {
// 			type: String,
// 			required: true,

// 		},
// 		email: {
// 			type: String,
//             required: true,
//             unique: true,
//             lowercase: true,
//             trim: true,

// 		},
// 		password: {
// 			type: String,
// 			minLength: 6,
// 			required: true,
// 		},
// 		phone: {
// 			type: String,
// 			minLength: 6,
// 			required: true,
// 		},
// 		country: {
// 			type: String,
// 			required: true,

// 		},
// 		state: {
// 			type: String,
// 			required: true,

// 		},
// 		city: {
// 			type: String,
// 			required: true,
// 		},
// 		streetAddress: {
// 			type: String,
// 			required: true,
//         },
//         dateOfBirth: {
//             type: Date,
//         },
//         zipCode: {
//             type: String,
//         },
// 		profilePic: {
// 			type: String,
// 			default: "https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg"
// 		},
// 		//    role: {
//         // type: String,
//         // enum: ['customer', 'admin', 'delivery', 'support'],
//         // default: 'customer',
// 		// },
// 		accountType: {
// 			type: String,
// 			enum: ['carDealer', 'retailer'],
// 			required: true,
// 		  },
// 	  // 🔐 Optional role & metadata
//       role: {
//         type: String,
//         enum: ['customer', 'admin', 'delivery', 'support'],
//         default: 'customer',
//       },

// 		  isVerified: {
// 			type: Boolean,
// 			default: false,
// 		  },
// 		  emailCode: String,
// 		  emailCodeExpires: Date,
// 		  resetCode: String,
// 		  resetCodeExpires: Date,
// 		  vverificationToken: String,
// 		  passwordHistory: [
// 			{
// 			  password: String,
// 			  changedAt: Date
// 			}
// 		],
// 		createdAt: {
// 			type: Date,
// 			default: Date.now
// 		  }

// 	},

// 	{
// 		timestamps: true,
// 	}
// );

// userSchema.pre( "save", async function ( next )
// {
// 	if (!this.isModified("password")) {
// 		return next();
// 	}
// 	this.password = await bcrypt.hash( this.password, 12 );
// 	next();
// } )

// userSchema.methods.correctPassword = async function ( candPwd )
// {
// 	return bcrypt.compare(candPwd, this.password)
// }

// userSchema.methods.setPasswordResetCode = function ()
// {
// 	const code = Math.floor( 1000 + Math.random() * 9000 ).toString();
// 	this.resetCode = crypto.createHash( "sha256" ).update( code ).digest( "hex" )
// 	this.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10minute
// 	return code; // we will email this
// };

// userSchema.methods.validateResetCode = function ( code )
// {
// 	const hash = crypto.createHash( "sha256" ).update( code ).digest( "hex" );
// 	return (
// 		hash === this.resetCode && this.resetCodeExpires && this.resetCodeExpires > Date.now()
// 	);
// }

// const User = mongoose.model("User", userSchema);

// export default User;
