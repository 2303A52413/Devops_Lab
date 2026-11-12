import { useEffect, useState } from "react";
import "./Categories.css";
import { apiRequest } from "./api";

function Categories({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  const loadCategories = async () => {
    try {
      setCategories(await apiRequest("/categories"));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleAddCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await apiRequest("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      setNewCategory("");
      await loadCategories();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await apiRequest(`/categories/${category._id}`, { method: "DELETE" });
      await loadCategories();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="categories-page">
      <div className="categories-header">
        <button onClick={onBack} className="back-btn">← Back to Dashboard</button>
        <h1>Categories Management</h1>
        <p>Manage announcement categories</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="category-add-section" onSubmit={handleAddCategory}>
        <input type="text" placeholder="Enter new category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} required />
        <button type="submit">+ Add Category</button>
      </form>
      <div className="category-list">
        <h2>Available Categories</h2>
        {categories.map((category) => (
          <div className="category-item" key={category._id}>
            <span>📁 {category.name}</span>
            <button onClick={() => handleDeleteCategory(category)}>Delete</button>
          </div>
        ))}
        {categories.length === 0 && <p>No categories available.</p>}
      </div>
    </div>
  );
}

export default Categories;
