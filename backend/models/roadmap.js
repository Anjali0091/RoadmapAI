import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  { day: String, topic: String, done: { type: Boolean, default: false } },
  { _id: false }
);

const phaseSchema = new mongoose.Schema(
  { title: String, period: String, days: [daySchema] },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    form: { duration: Number, hours: Number, level: String, style: String, stack: String },
    phases: [phaseSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Roadmap', roadmapSchema);