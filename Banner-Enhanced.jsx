import React, { useState, useEffect, useContext } from "react";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Banner = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl, GLOBLEURLFORS3 } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [contests, setContests] = useState([]);
  const [banners, setBanners] = useState([]);
  const [file, setFile] = useState({});
  const [formData, setFormData] = useState({
    id: "",
    action: "",
    file: null,
    start_time: "",
    end_time: "",
    status: "1",
    game_id: "",
    contest_id: "",
    action_url: "",
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadGames = async () => {
    try {
      const response = await axiosInstance.get(`${baseUrl}getGames`);
      setGames(response.data.data);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Failed to load games");
    }
  };

  useEffect(() => {
    const isLogin = getCookie("isLoggedIn");
    if (!isLogin || isLogin === "false") {
      console.log("Session expired.");
      toast.error("Session expired. Please log in again.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } else {
      loadGames();
    }
  }, []);

  useEffect(() => {
    const loadBannerList = async () => {
      try {
        const response = await axiosInstance.get(`${baseUrl}getBannerList`);
        console.log("Banner List Response:", response.data);
        setBanners(response.data.data);
      } catch (error) {
        console.error("Error loading banners:", error);
        setError("Failed to load banners.");
        toast.error("Failed to load banners");
      }
    };
    loadBannerList();
  }, [baseUrl]);

  useEffect(() => {
    const loadContestList = async () => {
      if (formData.game_id) {
        try {
          const response = await axiosInstance.post(
            `${baseUrl}getContestList`,
            {
              game_id: formData.game_id,
            }
          );
          setContests(response.data.data);
        } catch (error) {
          console.error("Error loading contests:", error);
          toast.error("Failed to load contests");
        }
      }
    };
    loadContestList();
  }, [formData.game_id, baseUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Ongoing";
    const date = new Date(isoString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const resetForm = () => {
    setFormData({
      id: "",
      action: "",
      file: null,
      start_time: "",
      end_time: "",
      status: "1",
      game_id: "",
      contest_id: "",
      action_url: "",
    });
    setFile({});
    setPreviewImage(null);
    setEditMode(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key !== 'file' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      if (file && file instanceof File) {
        submitData.append('file', file);
      }

      const endpoint = editMode ? `${baseUrl}updateBanner` : `${baseUrl}addBanner`;
      const response = await axiosInstance.post(endpoint, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(editMode ? "Banner updated successfully!" : "Banner added successfully!");
        resetForm();
        const bannerResponse = await axiosInstance.get(`${baseUrl}getBannerList`);
        setBanners(bannerResponse.data.data);
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting banner:", error);
      toast.error("Failed to submit banner");
      setError("Failed to submit banner. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner) => {
    setFormData({
      id: banner.id,
      action: banner.action || "",
      file: null,
      start_time: banner.start_time || "",
      end_time: banner.end_time || "",
      status: banner.status || "1",
      game_id: banner.game_id || "",
      contest_id: banner.contest_id || "",
      action_url: banner.action_url || "",
    });
    
    if (banner.image_url) {
      setPreviewImage(`${GLOBLEURLFORS3}${banner.image_url}`);
    }
    
    setEditMode(true);
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) {
      return;
    }

    try {
      const response = await axiosInstance.post(`${baseUrl}deleteBanner`, {
        id: bannerId
      });

      if (response.data.success) {
        toast.success("Banner deleted successfully!");
        const bannerResponse = await axiosInstance.get(`${baseUrl}getBannerList`);
        setBanners(bannerResponse.data.data);
      } else {
        toast.error(response.data.message || "Failed to delete banner");
      }
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Failed to delete banner");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            
            {/* Enhanced Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Banner Management
                    </h1>
                    <p className="text-gray-600 mt-1">Create and manage promotional banners for your platform</p>
                  </div>
                </div>
                
                {/* Stats Cards */}
                <div className="hidden lg:flex space-x-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Active Banners</p>
                        <p className="text-xl font-bold text-gray-900">{banners.filter(b => b.status === "1" || b.status === 1).length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Banners</p>
                        <p className="text-xl font-bold text-gray-900">{banners.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Banner Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {editMode ? "Edit Banner" : "Create New Banner"}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {editMode ? "Update your banner information" : "Fill in the details to create a new banner"}
                </p>
              </div>
              
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Game Selection */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Select Game
                        </label>
                        <select
                          name="game_id"
                          value={formData.game_id}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                          required
                        >
                          <option value="">Choose a game...</option>
                          {games.map((game) => (
                            <option key={game.id} value={game.id}>
                              {game.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Contest Selection */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Select Contest (Optional)
                        </label>
                        <select
                          name="contest_id"
                          value={formData.contest_id}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                        >
                          <option value="">No specific contest</option>
                          {contests.map((contest) => (
                            <option key={contest.id} value={contest.id}>
                              {contest.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Action URL */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Action URL
                        </label>
                        <input
                          type="url"
                          name="action_url"
                          value={formData.action_url}
                          onChange={handleInputChange}
                          placeholder="https://example.com/banner-action"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>

                      {/* Status */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Banner Status
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="status"
                              value="1"
                              checked={formData.status === "1"}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-green-600 border-2 border-gray-300 focus:ring-green-500"
                            />
                            <span className="flex items-center text-sm font-medium text-gray-700 group-hover:text-green-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Active
                            </span>
                          </label>
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="status"
                              value="0"
                              checked={formData.status === "0"}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-red-600 border-2 border-gray-300 focus:ring-red-500"
                            />
                            <span className="flex items-center text-sm font-medium text-gray-700 group-hover:text-red-600">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              Inactive
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Start Time */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          name="start_time"
                          value={formData.start_time}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>

                      {/* End Time */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          End Time
                        </label>
                        <input
                          type="datetime-local"
                          name="end_time"
                          value={formData.end_time}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>

                      {/* File Upload */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Banner Image
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 hover:bg-gray-100 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                        {previewImage && (
                          <div className="mt-4 relative group">
                            <div className="relative overflow-hidden rounded-xl shadow-lg">
                              <img
                                src={previewImage}
                                alt="Banner Preview"
                                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white rounded-full p-2 shadow-lg">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2 text-center">Banner Preview</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{editMode ? "Update Banner" : "Create Banner"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Enhanced Banner List */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Active Banners
                  </h2>
                  <div className="text-sm text-gray-300">
                    Total: <span className="font-semibold text-white">{banners.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {banners.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-4 font-semibold text-gray-700">Banner</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-700">Game</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-700">Contest</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-700">Schedule</th>
                          <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-center py-4 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {banners.map((banner) => (
                          <tr key={banner.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-4">
                                {banner.image_url ? (
                                  <div className="relative group">
                                    <img
                                      src={`${GLOBLEURLFORS3}${banner.image_url}`}
                                      alt="Banner"
                                      className="w-16 h-16 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200"></div>
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Banner #{banner.id}</p>
                                  <p className="text-xs text-gray-500">ID: {banner.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm font-medium text-gray-900">{banner.game_name || "N/A"}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-600">{banner.contest_name || "No Contest"}</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                <div className="text-gray-900 font-medium">Start: {formatDate(banner.start_time)}</div>
                                <div className="text-gray-600">End: {formatDate(banner.end_time)}</div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  banner.status === "1" || banner.status === 1
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full mr-2 ${
                                  banner.status === "1" || banner.status === 1 ? "bg-green-500" : "bg-red-500"
                                }`}></span>
                                {banner.status === "1" || banner.status === 1 ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEdit(banner)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200 group"
                                  title="Edit Banner"
                                >
                                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(banner.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 group"
                                  title="Delete Banner"
                                >
                                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No banners found</h3>
                    <p className="text-gray-600 mb-6">Create your first banner to get started with promotional campaigns.</p>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Banner
                    </button>
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

export default Banner;