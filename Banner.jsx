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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF)");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setFormData({ ...formData, file: selectedFile });

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
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (key !== 'file' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add file if selected
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
        // Reload banner list
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
        // Reload banner list
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-slate-800 font-bold">
                  Banner Management
                </h1>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Banner Form */}
            <div className="bg-white shadow-lg rounded-sm border border-slate-200 mb-8">
              <header className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">
                  {editMode ? "Edit Banner" : "Add New Banner"}
                </h2>
              </header>
              
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Game Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Game
                      </label>
                      <select
                        name="game_id"
                        value={formData.game_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Game</option>
                        {games.map((game) => (
                          <option key={game.id} value={game.id}>
                            {game.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contest Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Contest (Optional)
                      </label>
                      <select
                        name="contest_id"
                        value={formData.contest_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Contest</option>
                        {contests.map((contest) => (
                          <option key={contest.id} value={contest.id}>
                            {contest.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Action URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Action URL
                      </label>
                      <input
                        type="url"
                        name="action_url"
                        value={formData.action_url}
                        onChange={handleInputChange}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Banner Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!editMode}
                    />
                    {previewImage && (
                      <div className="mt-4">
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="max-w-xs h-auto rounded-md shadow-md"
                        />
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "Submitting..." : editMode ? "Update Banner" : "Add Banner"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Banner List */}
            <div className="bg-white shadow-lg rounded-sm border border-slate-200">
              <header className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Banner List</h2>
              </header>
              
              <div className="p-3">
                <div className="overflow-x-auto">
                  <table className="table-auto w-full">
                    <thead className="text-xs font-semibold uppercase text-slate-400 bg-slate-50">
                      <tr>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">Image</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">Game</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">Contest</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">Start Time</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">End Time</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-left">Status</div>
                        </th>
                        <th className="p-2 whitespace-nowrap">
                          <div className="font-semibold text-center">Actions</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {banners.length > 0 ? (
                        banners.map((banner) => (
                          <tr key={banner.id}>
                            <td className="p-2 whitespace-nowrap">
                              {banner.image_url && (
                                <img
                                  src={`${GLOBLEURLFORS3}${banner.image_url}`}
                                  alt="Banner"
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="text-left">{banner.game_name || "N/A"}</div>
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="text-left">{banner.contest_name || "N/A"}</div>
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="text-left">{formatDate(banner.start_time)}</div>
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="text-left">{formatDate(banner.end_time)}</div>
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="text-left">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    banner.status === "1" || banner.status === 1
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {banner.status === "1" || banner.status === 1 ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEdit(banner)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(banner.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="p-4 text-center text-slate-500">
                            No banners found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Banner;