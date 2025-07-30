import React, { useState, useEffect, useContext } from "react";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaEdit, FaPlus, FaList, FaTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MdDeleteForever, MdCategory, MdQuestionAnswer } from "react-icons/md";

const Question = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("category");
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [categoryForm, setCategoryForm] = useState({
    english_category: "",
    hindi_category: "",
    description: "",
    editingId: null,
  });
  const [questionForm, setQuestionForm] = useState({
    category_id: "",
    english_question: "",
    hindi_question: "",
    english_answer: "",
    hindi_answer: "",
    description: "",
    editingId: null,
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isQuestionDropdownOpen, setIsQuestionDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`${baseUrl}getCategory`);
      setCategories(response.data.data);
      toast.success(`Loaded ${response.data.data.length} categories`);
    } catch (err) {
      console.error("❌ Failed to load categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`${baseUrl}getQuestionContent`);
      setQuestions(response.data.data);
      toast.success(`Loaded ${response.data.data.length} questions`);
    } catch (err) {
      console.error("❌ Failed to load questions:", err);
      toast.error("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === "category") {
      loadCategories();
      setIsCategoryDropdownOpen(false); 
      setIsQuestionDropdownOpen(false);
    } else {
      loadQuestions();
      setIsQuestionDropdownOpen(false);
      setIsCategoryDropdownOpen(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (categoryForm.editingId) {
        await axiosInstance.put(`${baseUrl}updateQuestion`, {
          id: categoryForm.editingId,
          english_category: categoryForm.english_category,
          hindi_category: categoryForm.hindi_category,
          description: categoryForm.description,
        });
        toast.success("Category updated successfully!");
      } else {
        await axiosInstance.post(`${baseUrl}addQuestionCategory`, {
          english_category: categoryForm.english_category,
          hindi_category: categoryForm.hindi_category,
          description: categoryForm.description,
        });
        toast.success("Category added successfully!");
      }
      setCategoryForm({
        english_category: "",
        hindi_category: "",
        description: "",
        editingId: null,
      });
      loadCategories();
      setIsCategoryDropdownOpen(false); 
    } catch (err) {
      console.error("❌ Error submitting category:", err);
      toast.error("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionForm.category_id) {
      toast.warning("Please select a category!");
      return;
    }
    try {
      setIsLoading(true);
      if (questionForm.editingId) {
        await axiosInstance.put(`${baseUrl}updateQuestion`, {
          id: questionForm.editingId,
          category_id: questionForm.category_id,
          english_question: questionForm.english_question,
          hindi_question: questionForm.hindi_question,
          english_answer: questionForm.english_answer,
          hindi_answer: questionForm.hindi_answer,
          description: questionForm.description,
        });
        toast.success("Question updated successfully!");
      } else {
        await axiosInstance.post(`${baseUrl}addQuestionContent`, {
          category_id: questionForm.category_id,
          english_question: questionForm.english_question,
          hindi_question: questionForm.hindi_question,
          english_answer: questionForm.english_answer,
          hindi_answer: questionForm.hindi_answer,
          description: questionForm.description,
        });
        toast.success("Question added successfully!");
      }
      setQuestionForm({
        category_id: "",
        english_question: "",
        hindi_question: "",
        english_answer: "",
        hindi_answer: "",
        description: "",
        editingId: null,
      });
      loadQuestions();
      setIsQuestionDropdownOpen(false); 
    } catch (err) {
      console.error("❌ Error submitting question:", err);
      toast.error("Failed to save question");
    } finally {
      setIsLoading(false);
    }
  };

  const editCategory = (cat) => {
    setCategoryForm({
      english_category: cat.english_title,
      hindi_category: cat.hindi_title,
      description: cat.description,
      editingId: cat.id,
    });
    setActiveTab("category");
    setIsCategoryDropdownOpen(true); 
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        setIsLoading(true);
        await axiosInstance.delete(`${baseUrl}deleteQuestionCategory/${id}`);
        toast.success("Category deleted successfully!");
        loadCategories();
      } catch (err) {
        console.error("❌ Error deleting category:", err);
        toast.error("Failed to delete category");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const editQuestion = (q) => {
    setQuestionForm({
      category_id: q.category_id,
      english_question: q.english_question,
      hindi_question: q.hindi_question,
      english_answer: q.english_answer,
      hindi_answer: q.hindi_answer,
      description: q.description || "",
      editingId: q.id,
    });
    setActiveTab("question");
    setIsQuestionDropdownOpen(true);
  };

  const deleteQuestion = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        setIsLoading(true);
        await axiosInstance.delete(`${baseUrl}deleteQuestionContent/${id}`);
        toast.success("Question deleted successfully!");
        loadQuestions();
      } catch (err) {
        console.error("❌ Error deleting question:", err);
        toast.error("Failed to delete question");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.english_title : 'Unknown Category';
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      english_category: "",
      hindi_category: "",
      description: "",
      editingId: null,
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      category_id: "",
      english_question: "",
      hindi_question: "",
      english_answer: "",
      hindi_answer: "",
      description: "",
      editingId: null,
    });
  };

  useEffect(() => {
    loadCategories();
    loadQuestions();
    setActiveTab("category");
    setIsCategoryDropdownOpen(false); 
    setIsQuestionDropdownOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <div className="container mx-auto max-w-7xl">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Question Management System
                  </h1>
                  <p className="text-gray-600">
                    Manage categories and questions for your application
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Categories: <span className="font-semibold text-gray-900">{categories.length}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Questions: <span className="font-semibold text-gray-900">{questions.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex justify-center p-6">
                  <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border">
                    <button
                      className={`px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center ${
                        activeTab === "category"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() => switchTab("category")}
                    >
                      <MdCategory className="mr-2" />
                      Categories
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        activeTab === "category"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        {categories.length}
                      </span>
                    </button>
                    <button
                      className={`px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center ${
                        activeTab === "question"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      onClick={() => switchTab("question")}
                    >
                      <MdQuestionAnswer className="mr-2" />
                      Questions
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        activeTab === "question"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        {questions.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Loading Spinner */}
                {isLoading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                    </div>
                  </div>
                )}

                {/* Category Section */}
                {activeTab === "category" && (
                  <div className="space-y-6">
                    {/* Add Category Form */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl overflow-hidden">
                      <button
                        className="w-full px-6 py-4 text-left font-medium text-gray-900 hover:bg-blue-100 transition-colors duration-200 flex items-center justify-between"
                        onClick={() => {
                          setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                          if (!isCategoryDropdownOpen) resetCategoryForm();
                        }}
                      >
                        <div className="flex items-center">
                          <FaPlus className="mr-3 text-blue-600" />
                          <span className="text-lg">
                            {categoryForm.editingId ? "Edit Category" : "Add New Category"}
                          </span>
                        </div>
                        {isCategoryDropdownOpen ? <FaChevronUp className="text-blue-600" /> : <FaChevronDown className="text-blue-600" />}
                      </button>
                      
                      {isCategoryDropdownOpen && (
                        <div className="p-6 bg-white border-t border-blue-200">
                          <form onSubmit={handleCategorySubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  English Category Name *
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                                  value={categoryForm.english_category}
                                  onChange={(e) =>
                                    setCategoryForm({
                                      ...categoryForm,
                                      english_category: e.target.value,
                                    })
                                  }
                                  placeholder="Enter English category name"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Hindi Category Name *
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                                  value={categoryForm.hindi_category}
                                  onChange={(e) =>
                                    setCategoryForm({
                                      ...categoryForm,
                                      hindi_category: e.target.value,
                                    })
                                  }
                                  placeholder="Enter Hindi category name"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Description *
                              </label>
                              <textarea
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                                value={categoryForm.description}
                                onChange={(e) =>
                                  setCategoryForm({
                                    ...categoryForm,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Enter category description"
                                required
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center ${
                                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                <FaPlus className="mr-2" />
                                {categoryForm.editingId ? "Update Category" : "Add Category"}
                              </button>
                              {categoryForm.editingId && (
                                <button
                                  type="button"
                                  onClick={resetCategoryForm}
                                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Categories List */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <FaList className="mr-2 text-blue-600" />
                          Categories List ({categories.length})
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                #
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                English Name
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hindi Name
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {categories.map((cat, index) => (
                              <tr key={cat.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {cat.english_title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {cat.hindi_title}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {cat.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors duration-200 shadow-sm"
                                      onClick={() => editCategory(cat)}
                                    >
                                      <FaEdit className="mr-1" />
                                      Edit
                                    </button>
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors duration-200 shadow-sm"
                                      onClick={() => deleteCategory(cat.id)}
                                    >
                                      <FaTrashAlt className="mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {categories.length === 0 && (
                          <div className="text-center py-12">
                            <MdCategory className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new category.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Section */}
                {activeTab === "question" && (
                  <div className="space-y-6">
                    {/* Add Question Form */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl overflow-hidden">
                      <button
                        className="w-full px-6 py-4 text-left font-medium text-gray-900 hover:bg-emerald-100 transition-colors duration-200 flex items-center justify-between"
                        onClick={() => {
                          setIsQuestionDropdownOpen(!isQuestionDropdownOpen);
                          if (!isQuestionDropdownOpen) resetQuestionForm();
                        }}
                      >
                        <div className="flex items-center">
                          <FaPlus className="mr-3 text-emerald-600" />
                          <span className="text-lg">
                            {questionForm.editingId ? "Edit Question" : "Add New Question"}
                          </span>
                        </div>
                        {isQuestionDropdownOpen ? <FaChevronUp className="text-emerald-600" /> : <FaChevronDown className="text-emerald-600" />}
                      </button>
                      
                      {isQuestionDropdownOpen && (
                        <div className="p-6 bg-white border-t border-emerald-200">
                          <form onSubmit={handleQuestionSubmit} className="space-y-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Select Category *
                              </label>
                              <select
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                value={questionForm.category_id}
                                onChange={(e) =>
                                  setQuestionForm({
                                    ...questionForm,
                                    category_id: e.target.value,
                                  })
                                }
                                required
                              >
                                <option value="">Choose a category</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.english_title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  English Question *
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                  value={questionForm.english_question}
                                  onChange={(e) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      english_question: e.target.value,
                                    })
                                  }
                                  placeholder="Enter English question"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Hindi Question *
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                  value={questionForm.hindi_question}
                                  onChange={(e) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      hindi_question: e.target.value,
                                    })
                                  }
                                  placeholder="Enter Hindi question"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  English Answer *
                                </label>
                                <textarea
                                  rows="4"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                  value={questionForm.english_answer}
                                  onChange={(e) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      english_answer: e.target.value,
                                    })
                                  }
                                  placeholder="Enter English answer"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Hindi Answer *
                                </label>
                                <textarea
                                  rows="4"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                  value={questionForm.hindi_answer}
                                  onChange={(e) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      hindi_answer: e.target.value,
                                    })
                                  }
                                  placeholder="Enter Hindi answer"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Description *
                              </label>
                              <textarea
                                rows="3"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white shadow-sm"
                                value={questionForm.description}
                                onChange={(e) =>
                                  setQuestionForm({
                                    ...questionForm,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Enter question description"
                                required
                              />
                            </div>

                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center ${
                                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                <FaPlus className="mr-2" />
                                {questionForm.editingId ? "Update Question" : "Add Question"}
                              </button>
                              {questionForm.editingId && (
                                <button
                                  type="button"
                                  onClick={resetQuestionForm}
                                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Questions List */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <FaList className="mr-2 text-emerald-600" />
                          Questions List ({questions.length})
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                #
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                English Question
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hindi Question
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                English Answer
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hindi Answer
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {questions.map((q, index) => (
                              <tr key={q.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getCategoryName(q.category_id)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {q.english_question}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {q.hindi_question}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {q.english_answer}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {q.hindi_answer}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors duration-200 shadow-sm"
                                      onClick={() => editQuestion(q)}
                                    >
                                      <FaEdit className="mr-1" />
                                      Edit
                                    </button>
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors duration-200 shadow-sm"
                                      onClick={() => deleteQuestion(q.id)}
                                    >
                                      <FaTrashAlt className="mr-1" />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {questions.length === 0 && (
                          <div className="text-center py-12">
                            <MdQuestionAnswer className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No questions found</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new question.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Question;