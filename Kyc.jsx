import React, { useState, useEffect, useContext } from "react";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Kyc = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl, GLOBLEURLFORS3 } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for KYC data and UI
  const [allKycData, setAllKycData] = useState([]);
  const [filteredKycData, setFilteredKycData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchParams, setSearchParams] = useState({
    team_name: "",
    phone_no: "",
    pan_status: "",
    bank_status: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    imageSrc: "",
    user: null,
    currentScale: 1,
    currentRotation: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    isRotating: false,
    dragStartX: 0,
    dragStartY: 0,
    lastX: 0,
  });

  useEffect(() => {
    const isLogin = getCookie("isLoggedIn");
    if (!isLogin || isLogin === "false") {
      console.log("Session expired.");
      toast.error("Session expired. Please log in again.");
      setInterval(() => {
        navigate("/login");
      }, 1500);
    }
  }, []);

  // Fetch KYC data
  const fetchKycData = async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post(
        `${baseUrl}getKycInReviewList`,
        params
      );
      if (response.data && Array.isArray(response.data.data)) {
        setAllKycData(response.data.data);
        applyFilters(response.data.data, searchParams);
        setSelectedUser(
          response.data.data.length > 0 ? response.data.data[0] : null
        );
        toast.success(`Loaded ${response.data.data.length} KYC requests`);
      } else {
        setAllKycData([]);
        setFilteredKycData([]);
        setSelectedUser(null);
        setError("No KYC data available");
      }
    } catch (error) {
      console.error("Error fetching KYC data:", error);
      setError("Failed to fetch KYC data. Please try again later.");
      toast.error("Failed to fetch KYC data");
      setAllKycData([]);
      setFilteredKycData([]);
      setSelectedUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side filtering based on search parameters
  const applyFilters = (data, params) => {
    let filteredData = [...data];

    if (params.team_name) {
      filteredData = filteredData.filter((user) =>
        user.user_team_name
          ?.toLowerCase()
          .includes(params.team_name.toLowerCase())
      );
    }

    if (params.phone_no) {
      filteredData = filteredData.filter((user) =>
        user.user_phone_no?.includes(params.phone_no)
      );
    }

    if (params.pan_status) {
      filteredData = filteredData.filter(
        (user) => user.pan_status === params.pan_status
      );
    }

    if (params.bank_status) {
      filteredData = filteredData.filter(
        (user) => user.bank_acc_status === params.bank_status
      );
    }

    if (
      !params.team_name &&
      !params.phone_no &&
      !params.pan_status &&
      !params.bank_status
    ) {
      filteredData = [...data];
    }

    setFilteredKycData(filteredData);
    setSelectedUser(filteredData.length > 0 ? filteredData[0] : null);
  };

  // Handle search
  const handleSearch = () => {
    const params = {};
    if (searchParams.team_name) params.team_name = searchParams.team_name;
    if (searchParams.phone_no) params.phone_no = searchParams.phone_no;
    if (searchParams.pan_status) params.pan_status = searchParams.pan_status;
    if (searchParams.bank_status) params.bank_status = searchParams.bank_status;

    fetchKycData(params);
  };

  // Handle status change
  const handleStatusChange = async (user, type, status, message = "") => {
    try {
      const payload = {
        id: user.id,
        pan_no: user.pan_no,
        bank_acc_no: user.bank_acc_no,
        bank_ifsc_no: user.bank_ifsc_no,
        type: type,
        bank_name: user.bank_name,
        pan_name: user.pan_name,
        pan_image: user.pan_image,
        bank_image: user.bank_acc_img,
        ...(type === "PAN" ? { pan_status: status } : {}),
        ...(type === "BANK" ? { bank_acc_status: status } : {}),
        ...(message ? { rejection_reason: message } : {}),
      };

      const response = await axiosInstance.put(
        `${baseUrl}updateDocStatus`,
        payload
      );

      const updatedData = allKycData.map((u) =>
        u.id === user.id
          ? {
              ...u,
              ...(type === "PAN"
                ? { pan_status: status, pan_msg: message }
                : { bank_acc_status: status, bank_msg: message }),
            }
          : u
      );

      setAllKycData(updatedData);
      applyFilters(updatedData, searchParams);
      
      const actionText = status === "approved" ? "approved" : "rejected";
      toast.success(`${type} document ${actionText} successfully!`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(`Failed to update ${type} status`);
    }
  };

  // Modal functions
  const openModal = (imageSrc, user = null) => {
    setModalState({
      ...modalState,
      isOpen: true,
      imageSrc,
      user,
      currentScale: 1,
      currentRotation: 0,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isRotating: false,
      dragStartX: 0,
      dragStartY: 0,
      lastX: 0,
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false,
    });
  };

  const zoomImage = (factor) => {
    setModalState((prev) => ({
      ...prev,
      currentScale: Math.max(0.1, Math.min(5, prev.currentScale * factor)),
    }));
  };

  const rotateImage = () => {
    setModalState((prev) => ({
      ...prev,
      currentRotation: (prev.currentRotation + 90) % 360,
    }));
  };

  const resetImage = () => {
    setModalState((prev) => ({
      ...prev,
      currentScale: 1,
      currentRotation: 0,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      setModalState((prev) => ({
        ...prev,
        isRotating: true,
        lastX: e.clientX,
      }));
    } else if (e.button === 0) {
      setModalState((prev) => ({
        ...prev,
        isDragging: true,
        dragStartX: e.clientX - prev.offsetX,
        dragStartY: e.clientY - prev.offsetY,
      }));
    }
  };

  const handleMouseUp = () => {
    setModalState((prev) => ({
      ...prev,
      isDragging: false,
      isRotating: false,
    }));
  };

  const handleMouseMove = (e) => {
    if (modalState.isRotating) {
      const deltaX = e.clientX - modalState.lastX;
      setModalState((prev) => ({
        ...prev,
        currentRotation: prev.currentRotation + deltaX * 0.5,
        lastX: e.clientX,
      }));
    }

    if (modalState.isDragging) {
      setModalState((prev) => ({
        ...prev,
        offsetX: e.clientX - prev.dragStartX,
        offsetY: e.clientY - prev.dragStartY,
      }));
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomImage(factor);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalState.isOpen) return;

      switch (e.key) {
        case "ArrowUp":
          zoomImage(1.1);
          break;
        case "ArrowDown":
          zoomImage(0.9);
          break;
        case "ArrowRight":
          rotateImage();
          break;
        case "r":
        case "R":
          resetImage();
          break;
        case "Escape":
          closeModal();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalState.isOpen]);

  const setRejectionMessage = (userId, type, value) => {
    if (!value) return;
    const updatedData = allKycData.map((user) =>
      user.id === userId
        ? {
            ...user,
            ...(type === "PAN" ? { pan_msg: value } : { bank_msg: value }),
          }
        : user
    );
    setAllKycData(updatedData);
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(updatedData.find((u) => u.id === userId));
    }
  };

  // Handle click to redirect to UserKycData in a new tab
  const handleUserClick = (userId) => {
    window.open(`/userKycData?user_id=${userId}`, "_blank");
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({
      team_name: "",
      phone_no: "",
      pan_status: "",
      bank_status: "",
    });
    applyFilters(allKycData, {});
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const getStatusStyle = (status) => {
      switch (status) {
        case "approved":
          return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "rejected":
          return "bg-red-100 text-red-800 border-red-200";
        case "inreview":
          return "bg-blue-100 text-blue-800 border-blue-200";
        case "pending":
          return "bg-amber-100 text-amber-800 border-amber-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
        {status || "In Review"}
      </span>
    );
  };

  // Initial fetch
  useEffect(() => {
    fetchKycData();
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
                    KYC Verification Center
                  </h1>
                  <p className="text-gray-600">
                    Review and approve user identity verification documents
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Total Requests: <span className="font-semibold text-gray-900">{filteredKycData.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Search Section */}
              <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Search & Filter KYC Requests
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Team Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                        placeholder="Enter Team Name"
                        maxLength="20"
                        value={searchParams.team_name}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            team_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                        placeholder="Enter Phone Number"
                        maxLength="10"
                        value={searchParams.phone_no}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            phone_no: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        PAN Status
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                        value={searchParams.pan_status}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            pan_status: e.target.value,
                          })
                        }
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="inreview">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Bank Status
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
                        value={searchParams.bank_status}
                        onChange={(e) =>
                          setSearchParams({
                            ...searchParams,
                            bank_status: e.target.value,
                          })
                        }
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="inreview">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </button>
                    <button
                      onClick={clearFilters}
                      className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6 rounded-r-lg">
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

              {/* Loading Spinner */}
              {isLoading && (
                <div className="flex justify-center items-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                  </div>
                </div>
              )}

              {/* KYC Content */}
              <div className="flex flex-col lg:flex-row">
                {/* Team List */}
                <div className="w-full lg:w-1/3 p-6 bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      KYC Requests
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {filteredKycData.length}
                    </span>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-red-500 mt-2">{error}</p>
                    </div>
                  ) : filteredKycData.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20a3 3 0 01-3-3v-2a3 3 0 013-3h3a3 3 0 013 3v2a3 3 0 01-3 3H7z" />
                      </svg>
                      <p className="text-gray-500 mt-2">No KYC requests found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredKycData.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedUser?.id === user.id
                              ? "bg-blue-50 border-blue-300 shadow-md"
                              : "bg-white border-gray-200 hover:border-blue-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {user.user_team_name || "N/A"}
                              </h4>
                              <p className="text-xs text-gray-600 mt-1">
                                {user.display_name || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {user.phone_no || "N/A"}
                              </p>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <StatusBadge status={user.pan_status} />
                              <StatusBadge status={user.bank_acc_status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Details */}
                <div className="w-full lg:w-2/3 p-6">
                  {!selectedUser ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No Request Selected</h3>
                      <p className="mt-2 text-gray-500">Select a KYC request from the list to view details</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* User Info Card */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3
                            className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => handleUserClick(selectedUser.id)}
                          >
                            {selectedUser.user_team_name || "N/A"}
                          </h3>
                          <button
                            onClick={() => handleUserClick(selectedUser.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Profile
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Name</p>
                              <p className="text-sm text-gray-900">{selectedUser.display_name || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Phone</p>
                              <p className="text-sm text-gray-900">{selectedUser.phone_no || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Email</p>
                              <p className="text-sm text-gray-900">{selectedUser.email_id || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Verification Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PAN Card */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-white flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                PAN Verification
                              </h4>
                              <StatusBadge status={selectedUser.pan_status} />
                            </div>
                          </div>
                          <div className="p-6 space-y-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-500">PAN Number</p>
                                <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                                  {selectedUser.pan_no || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Name on PAN</p>
                                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                                  {selectedUser.pan_name || "N/A"}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() =>
                                openModal(
                                  `${GLOBLEURLFORS3}kyc/${selectedUser.pan_image}`,
                                  selectedUser
                                )
                              }
                              disabled={!selectedUser.pan_image}
                              className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                !selectedUser.pan_image
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                              }`}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View PAN Document
                            </button>

                            <select
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                              value={selectedUser.pan_status || ""}
                              onChange={(e) => {
                                const status = e.target.value;
                                if (status === "") return;
                                if (status === "rejected") {
                                  const updatedUser = {
                                    ...selectedUser,
                                    pan_status: status,
                                    pan_msg: selectedUser.pan_msg || "",
                                  };
                                  setSelectedUser(updatedUser);
                                } else {
                                  handleStatusChange(selectedUser, "PAN", status);
                                }
                              }}
                            >
                              <option value="">Select Action</option>
                              <option value="approved">✅ Approve PAN</option>
                              <option value="rejected">❌ Reject PAN</option>
                            </select>

                            {(selectedUser.pan_status === "rejected" ||
                              (selectedUser.pan_status === null && selectedUser.pan_msg)) && (
                              <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                <label className="block text-sm font-medium text-red-700">
                                  Rejection Reason
                                </label>
                                <select
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                                  value={selectedUser.pan_msg || ""}
                                  onChange={(e) =>
                                    setRejectionMessage(selectedUser.id, "PAN", e.target.value)
                                  }
                                >
                                  <option value="">Select a reason</option>
                                  <option value="PAN card is not clearly visible. Please upload a clear image.">
                                    PAN card is not clearly visible
                                  </option>
                                  <option value="Name doesn't match with your PAN card. Enter the correct name as per your PAN.">
                                    Name doesn't match
                                  </option>
                                  <option value="Wrong document uploaded. Please upload your PAN card.">
                                    Wrong document uploaded
                                  </option>
                                  <option value="PAN number doesn't match. Enter the correct PAN number.">
                                    PAN number doesn't match
                                  </option>
                                  <option value="You uploaded a bank passbook instead of PAN.">
                                    Uploaded bank passbook instead of PAN
                                  </option>
                                  <option value="Other">Other</option>
                                </select>
                                <textarea
                                  rows="3"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                                  placeholder="Enter custom message (optional)"
                                  value={selectedUser.pan_msg || ""}
                                  onChange={(e) => {
                                    const updatedUser = {
                                      ...selectedUser,
                                      pan_msg: e.target.value,
                                    };
                                    setSelectedUser(updatedUser);
                                  }}
                                ></textarea>
                                <button
                                  onClick={() => {
                                    if (!selectedUser.pan_msg) {
                                      toast.warning("Please select or enter a rejection reason.");
                                      return;
                                    }
                                    handleStatusChange(
                                      selectedUser,
                                      "PAN",
                                      "rejected",
                                      selectedUser.pan_msg
                                    );
                                  }}
                                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                  Submit PAN Rejection
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bank Document */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-white flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Bank Verification
                              </h4>
                              <StatusBadge status={selectedUser.bank_acc_status} />
                            </div>
                          </div>
                          <div className="p-6 space-y-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Bank Name</p>
                                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                                  {selectedUser.bank_name || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Account Number</p>
                                <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                                  {selectedUser.bank_acc_no || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">IFSC Code</p>
                                <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                                  {selectedUser.bank_ifsc_no || "N/A"}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() =>
                                openModal(
                                  `${GLOBLEURLFORS3}kyc/${selectedUser.bank_acc_img}`,
                                  selectedUser
                                )
                              }
                              disabled={!selectedUser.bank_acc_img}
                              className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                !selectedUser.bank_acc_img
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md"
                              }`}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Bank Document
                            </button>

                            <select
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                              value={selectedUser.bank_acc_status || ""}
                              onChange={(e) => {
                                const status = e.target.value;
                                if (status === "") return;
                                if (status === "rejected") {
                                  const updatedUser = {
                                    ...selectedUser,
                                    bank_acc_status: status,
                                    bank_msg: selectedUser.bank_msg || "",
                                  };
                                  setSelectedUser(updatedUser);
                                } else {
                                  handleStatusChange(selectedUser, "BANK", status);
                                }
                              }}
                            >
                              <option value="">Select Action</option>
                              <option value="approved">✅ Approve Bank</option>
                              <option value="rejected">❌ Reject Bank</option>
                            </select>

                            {(selectedUser.bank_acc_status === "rejected" ||
                              (selectedUser.bank_acc_status === null && selectedUser.bank_msg)) && (
                              <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                <label className="block text-sm font-medium text-red-700">
                                  Rejection Reason
                                </label>
                                <select
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                                  value={selectedUser.bank_msg || ""}
                                  onChange={(e) =>
                                    setRejectionMessage(selectedUser.id, "BANK", e.target.value)
                                  }
                                >
                                  <option value="">Select a reason</option>
                                  <option value="Bank cheque is unclear. Upload a clear scan or image.">
                                    Bank document is unclear
                                  </option>
                                  <option value="Account number doesn't match the document. Enter the correct number as per the bank document.">
                                    Account number mismatch
                                  </option>
                                  <option value="Account holder name doesn't match. Enter the correct name as per the bank document.">
                                    Account name mismatch
                                  </option>
                                  <option value="IFSC code is incorrect. Enter the correct code as per the bank document.">
                                    IFSC code incorrect
                                  </option>
                                  <option value="Bank name doesn't match. Enter the correct name as per the document.">
                                    Bank name mismatch
                                  </option>
                                  <option value="You uploaded a PAN card instead of a bank document. Please upload the correct bank document.">
                                    Uploaded PAN instead of bank doc
                                  </option>
                                  <option value="Please upload a proper image or scan of your bank document.">
                                    Upload clear image
                                  </option>
                                  <option value="You can upload a passbook, cheque, or bank statement.">
                                    Suggest valid doc types
                                  </option>
                                  <option value="Please upload a proper bank document with correct name, IFSC, and account number.">
                                    Incorrect details in doc
                                  </option>
                                  <option value="Other">Other</option>
                                </select>
                                <textarea
                                  rows="3"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                                  placeholder="Enter custom message (optional)"
                                  value={selectedUser.bank_msg || ""}
                                  onChange={(e) => {
                                    const updatedUser = {
                                      ...selectedUser,
                                      bank_msg: e.target.value,
                                    };
                                    setSelectedUser(updatedUser);
                                  }}
                                ></textarea>
                                <button
                                  onClick={() => {
                                    if (!selectedUser.bank_msg) {
                                      toast.warning("Please select or enter a rejection reason.");
                                      return;
                                    }
                                    handleStatusChange(
                                      selectedUser,
                                      "BANK",
                                      "rejected",
                                      selectedUser.bank_msg
                                    );
                                  }}
                                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                  Submit Bank Rejection
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Document Viewer Modal */}
      {modalState.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-40 backdrop-blur-sm"
            onClick={closeModal}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-[95vh] flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Document Viewer</h3>
                  <p className="text-blue-100 text-sm">Use mouse wheel to zoom, drag to pan</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 focus:outline-none p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="flex-1 p-6 overflow-hidden">
                  <div
                    className="relative overflow-hidden bg-gray-100 rounded-lg"
                    style={{ height: "500px" }}
                  >
                    <img
                      src={modalState.imageSrc}
                      alt="KYC Document"
                      className="max-w-full max-h-full object-contain mx-auto transition-transform duration-200"
                      style={{
                        transform: `translate(${modalState.offsetX}px, ${modalState.offsetY}px) scale(${modalState.currentScale}) rotate(${modalState.currentRotation}deg)`,
                        cursor: modalState.isDragging ? "grabbing" : "grab",
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                  <div className="flex justify-center space-x-3 mt-6">
                    <button
                      onClick={rotateImage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center shadow-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rotate
                    </button>
                    <button
                      onClick={() => zoomImage(1.2)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center shadow-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Zoom In
                    </button>
                    <button
                      onClick={() => zoomImage(0.8)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center shadow-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Zoom Out
                    </button>
                    <button
                      onClick={resetImage}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center shadow-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>
                {modalState.user && (
                  <div className="w-full lg:w-80 p-6 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 overflow-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      User Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                        <p className="text-sm text-gray-900 font-medium">
                          {modalState.user.display_name || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-sm text-gray-900 font-mono">
                          {modalState.user.phone_no || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="text-sm text-gray-900 break-all">
                          {modalState.user.email_id || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PAN Number</p>
                        <p className="text-sm text-gray-900 font-mono">
                          {modalState.user.pan_no || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PAN Status</p>
                        <div className="mt-1">
                          <StatusBadge status={modalState.user.pan_status} />
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Name</p>
                        <p className="text-sm text-gray-900">
                          {modalState.user.bank_name || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</p>
                        <p className="text-sm text-gray-900 font-mono">
                          {modalState.user.bank_acc_no || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Status</p>
                        <div className="mt-1">
                          <StatusBadge status={modalState.user.bank_acc_status} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Kyc;