// const mongoose = require("mongoose");

// const courseSchema = new mongoose.Schema({
//   title: String,
//   description: String,
//   price: Number,

//   modules: {
//     type: [
//       {
//         title: String,

//         lessons: {
//           type: [
//             {
//               title: String,
//               video: String
//             }
//           ],
//           default: []
//         }
//       }
//     ],
//     default: []
//   },

//   thumbnail: String,
//   category: String,

//   overview: String,

//   content: [String],
//   objectives: [String],
//   features: [String],

//   careerBenefits: [
//     {
//       title: String,
//       description: String
//     }
//   ],

//   certifications: [String]
// });

// module.exports = mongoose.model("Course", courseSchema);

// const mongoose = require("mongoose");

// const courseSchema = new mongoose.Schema({

//   title: String,
//   description: String,
//   price: Number,

//   modules: [
//     {
//       title: String,

//       lessons: [
//         {
//           title: String,

//           videos: {
//             type: [String],
//             default: []
//           }
//         }
//       ]
//     }
//   ],

//   thumbnail: String,
//   category: String,
//   overview: String,
//   content: [String],
//   objectives: [String],
//   features: [String],
//   careerBenefits: [
//          {
//        title: String,
//        description: String
//     }
//    ],


// });

// module.exports = mongoose.model("Course", courseSchema);


const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,

  modules: [
    {
      title: String,

      lessons: [
        {
          title: String,

          // ✅ Singular field name
          videos: {
            type: [String],
            default: []
          }
        }
      ]
    }
  ],

  thumbnail: String,
  category: String,
  overview: String,

  content: {
    type: [String],
    default: []
  },

  objectives: {
    type: [String],
    default: []
  },

  features: {
    type: [String],
    default: []
  },

  careerBenefits: {
    type: [
      {
        title: String,
        description: String
      }
    ],
    default: []
  },

  certifications: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Course", courseSchema);