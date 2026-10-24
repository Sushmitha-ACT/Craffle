import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true },
  categoryIcon: { type: String }
});

const CategoryModel = mongoose.model('Category', categorySchema);
export const Category = (mongoose.models.Category as typeof CategoryModel) || CategoryModel;
