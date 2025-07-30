import React, { useState, useEffect, useContext } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Contests = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contests, setContests] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    game_id: "",
    start_time: "",
    end_time: "",
    max_participants: "",
    entry_fee: "",
    prize_pool: "",
    status: "1",
    rules: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGame, setFilterGame] = useState("all");

  useEffect(() => {
    const isLogin = getCookie("isLoggedIn");
    if (!isLogin || isLogin === "false") {
      console.log("Session expired.");
      toast.error("Session expired. Please log in again.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } else {
      loadContests();
      loadGames();
    }
  }, []);

  const loadContests = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${baseUrl}getContests`);
      if (response.data.success) {
        setContests(response.data.data);
      }
    } catch (error) {
      console.error("Error loading contests:", error);
      toast.error("Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async () => {
    try {
      const response = await axiosInstance.get(`${baseUrl}getGames`);
      if (response.data.success) {
        setGames(response.data.data);
      }
    } catch (error) {
      console.error("Error loading games:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      game_id: "",
      start_time: "",
      end_time: "",
      max_participants: "",
      entry_fee: "",
      prize_pool: "",
      status: "1",
      rules: "",
    });
    setEditMode(false);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = editMode ? `${baseUrl}updateContest` : `${baseUrl}addContest`;
      const response = await axiosInstance.post(endpoint, formData);

      if (response.data.success) {
        toast.success(editMode ? "Contest updated successfully!" : "Contest added successfully!");
        resetForm();
        loadContests();
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting contest:", error);
      toast.error("Failed to submit contest");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contest) => {
    setFormData({
      id: contest.id,
      name: contest.name || "",
      description: contest.description || "",
      game_id: contest.game_id || "",
      start_time: contest.start_time || "",
      end_time: contest.end_time || "",
      max_participants: contest.max_participants || "",
      entry_fee: contest.entry_fee || "",
      prize_pool: contest.prize_pool || "",
      status: contest.status || "1",
      rules: contest.rules || "",
    });
    
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (contestId) => {
    if (!window.confirm("Are you sure you want to delete this contest?")) {
      return;
    }

    try {
      const response = await axiosInstance.post(`${baseUrl}deleteContest`, {
        id: contestId
      });

      if (response.data.success) {
        toast.success("Contest deleted successfully!");
        loadContests();
      } else {
        toast.error(response.data.message || "Failed to delete contest");
      }
    } catch (error) {
      console.error("Error deleting contest:", error);
      toast.error("Failed to delete contest");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString();
  };

  const getContestStatus = (contest) => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);

    if (contest.status === "0" || contest.status === 0) {
      return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
    }

    if (now < startTime) {
      return { label: "Upcoming", color: "bg-blue-100 text-blue-800" };
    } else if (now >= startTime && now <= endTime) {
      return { label: "Live", color: "bg-green-100 text-green-800" };
    } else {
      return { label: "Ended", color: "bg-red-100 text-red-800" };
    }
  };

  const filteredContests = contests.filter(contest => {
    const matchesSearch = contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contest.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || contest.status.toString() === filterStatus;
    const matchesGame = filterGame === "all" || contest.game_id.toString() === filterGame;
    return matchesSearch && matchesStatus && matchesGame;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            
            {/* Header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-slate-800 font-bold">Contests Management</h1>
                <p className="text-slate-600">Manage contests and competitions</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
              >
                <svg className="w-4 h-4 fill-current opacity-50 shrink-0" viewBox="0 0 16 16">
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                </svg>
                <span className="ml-2">Add New Contest</span>
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow-lg rounded-sm border border-slate-200 mb-8">
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Search Contests
                    </label>
                    <input
                      type="text"
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Filter by Game
                    </label>
                    <select
                      value={filterGame}
                      onChange={(e) => setFilterGame(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Games</option>
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Filter by Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                        setFilterGame("all");
                      }}
                      className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contests Table */}
            <div className="bg-white shadow-lg rounded-sm border border-slate-200">
              <header className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">
                  Contests List ({filteredContests.length})
                </h2>
              </header>
              
              <div className="p-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredContests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full">
                      <thead className="text-xs font-semibold uppercase text-slate-400 bg-slate-50">
                        <tr>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Contest Name</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Game</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Start Time</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">End Time</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Participants</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Entry Fee</div>
                          </th>
                          <th className="p-2 whitespace-nowrap">
                            <div className="font-semibold text-left">Prize Pool</div>
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
                        {filteredContests.map((contest) => {
                          const status = getContestStatus(contest);
                          const gameName = games.find(g => g.id === contest.game_id)?.name || "Unknown Game";
                          
                          return (
                            <tr key={contest.id}>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left">
                                  <div className="font-medium text-slate-900">{contest.name}</div>
                                  <div className="text-slate-500 text-xs truncate max-w-xs">
                                    {contest.description}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left">{gameName}</div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left text-xs">{formatDate(contest.start_time)}</div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left text-xs">{formatDate(contest.end_time)}</div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left">
                                  {contest.current_participants || 0}/{contest.max_participants || "∞"}
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left">${contest.entry_fee || 0}</div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left font-medium text-green-600">
                                  ${contest.prize_pool || 0}
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="text-left">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    onClick={() => handleEdit(contest)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(contest.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No contests found</h3>
                    <p className="text-slate-500">Get started by creating your first contest.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editMode ? "Edit Contest" : "Add New Contest"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contest Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contest Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Game Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Game *
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

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Max Participants */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Entry Fee */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Entry Fee ($)
                    </label>
                    <input
                      type="number"
                      name="entry_fee"
                      value={formData.entry_fee}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Prize Pool */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prize Pool ($)
                    </label>
                    <input
                      type="number"
                      name="prize_pool"
                      value={formData.prize_pool}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contest Rules
                  </label>
                  <textarea
                    name="rules"
                    value={formData.rules}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
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
                    {loading ? "Saving..." : editMode ? "Update Contest" : "Add Contest"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contests;