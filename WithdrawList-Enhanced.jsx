import React, { useState, useEffect, useContext } from "react";
import DataTable from "react-data-table-component";
import axiosInstance from "../../axiosInstance";
import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";
import { StoreContext } from "../context/storeContext";
import "../css/withdrawList.css";
import CustomPagination from "../components/CustomPagination";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const WithdrawList = () => {
  const navigate = useNavigate();
  const { getCookie, baseUrl } = useContext(StoreContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterId, setFilterId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("DESC");

  useEffect(() => {
    checkRoleAccess(["admin", "accountant"]);
    loadWithdrawHistory(currentStatus, currentPage, sortField, sortDirection);
    fetchSettlementDate();
  }, []);

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

  const checkRoleAccess = (roles) => {
    console.log("Checking role access for:", roles);
  };

  const fetchSettlementDate = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${baseUrl}getSettlementDate`);
      const dateObj = new Date(response.data.data);
      setSettlementDate(
        dateObj.toLocaleString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    } catch (error) {
      console.error("Error fetching settlement date:", error);
      setError("Failed to fetch settlement date");
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawHistory = async (
    status,
    page = 1,
    sortField,
    sortDirection,
    limit = itemsPerPage
  ) => {
    const offset = (page - 1) * limit;

    const response = await axiosInstance.post("/getWithdrawHistory", {
      status,
      offset,
      limit,
      sortField,
      sortDirection,
    });

    const responseData = response.data;

    setTotalItems(responseData.totalItems || 0);
    setData(
      Array.isArray(responseData.data)
        ? responseData.data.map((item) => ({ ...item, selected: false }))
        : []
    );
  };

  const filterWithdrawById = async () => {
    if (!filterId) {
      alert("Please enter a valid ID to filter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        `${baseUrl}getWithdrawHistory`,
        {
          status: "Pending",
          max_id: Number(filterId),
          sortField,
          sortDirection,
        }
      );

      const responseData = response.data;
      setData(
        Array.isArray(responseData.data)
          ? responseData.data.map((item) => ({ ...item, selected: false }))
          : []
      );
      setTotalItems(responseData.data.length || 0);
    } catch (error) {
      console.error("Error filtering withdraw history:", error);
      setError("No Data Found for this ID.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const updatePendingToSuccess = async () => {
    const selectedRows = data.filter((row) => row.selected);
    console.log("data", data);
    const ids = selectedRows.map((row) => row.id);

    if (ids.length === 0) {
      alert("Please select at least one entry to mark as Success.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SelectedData");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "selected_withdrawals.xlsx");

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateWithdrawStatus`,
        {
          status: "Success",
          max_id: Number(filterId) || undefined,
          ids,
        }
      );

      if (response.data.status === 200) {
        alert("Selected entries marked as Success successfully!");
        loadWithdrawHistory("Pending", 1, sortField, sortDirection);
      } else {
        alert("Failed to update statuses: " + (response.data.message || ""));
      }
    } catch (error) {
      console.error("Error updating statuses:", error);
      alert("Something went wrong while updating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSuccessToReject = async (id, reason) => {
    if (!reason) {
      alert("Please select a reject reason before rejecting.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to reject transaction ID ${id} with reason: "${reason}"?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateWithdrawStatusReject`,
        {
          status: "Rejected",
          id,
          reason,
        }
      );

      if (response.data.status === 200) {
        alert("Transaction rejected successfully!");
        loadWithdrawHistory("Success", currentPage, sortField, sortDirection);
      } else {
        alert("Failed to reject transaction: " + (response.data.message || ""));
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      alert("Something went wrong while rejecting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateSettlementDate = async () => {
    if (!expectedDate) {
      alert("Please select expected settlement date.");
      return;
    }

    const localDate = new Date(expectedDate);
    if (isNaN(localDate.getTime())) {
      alert("Invalid date format.");
      return;
    }

    const utcDate = localDate.toISOString();

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${baseUrl}updateSettlementDate`,
        {
          expectedDate: utcDate,
        }
      );

      if (response.status === 200) {
        alert("Settlement date updated successfully!");
        setExpectedDate("");
        fetchSettlementDate();
      }
    } catch (error) {
      console.error("Error updating settlement date:", error);
      alert("Something went wrong while updating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (selected) => {
    setData((prevData) => prevData.map((row) => ({ ...row, selected })));
  };

  useEffect(() => {
    setCurrentPage(1);
    loadWithdrawHistory(currentStatus, 1, sortField, sortDirection);
  }, [currentStatus, sortField, sortDirection]);

  const handleRowSelect = (id) => {
    setData((prevData) =>
      prevData.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const handleReasonChange = (id, reason) => {
    setData((prevData) =>
      prevData.map((row) =>
        row.id === id ? { ...row, reject_reason: reason } : row
      )
    );
  };

  const handleFilterIdInput = (e) => {
    const value = e.target.value;
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setFilterId(value);
    }
  };

  const handleSort = (column, sortDirection) => {
    setSortField(column.selector);
    setSortDirection(sortDirection);
    loadWithdrawHistory(
      currentStatus,
      currentPage,
      column.selector,
      sortDirection,
      itemsPerPage
    );
  };

  const columns = [
    {
      name: "ID",
      selector: (row) => row.id || "",
      sortable: true,
      center: true,
      width: "80px",
      cell: (row) => (
        <div className="font-semibold text-blue-600">#{row.id}</div>
      ),
    },
    {
      name: "Transaction ID",
      selector: (row) => row.trans_id || "",
      sortable: true,
      center: true,
      width: "140px",
      cell: (row) => (
        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {row.trans_id}
        </div>
      ),
    },
    {
      name: "User Details",
      selector: (row) => row.user_name || "",
      sortable: true,
      width: "160px",
      cell: (row) => (
        <div className="text-left">
          <div className="font-semibold text-gray-900">{row.user_name}</div>
          <div className="text-xs text-gray-500">ID: {row.user_id}</div>
        </div>
      ),
    },
    {
      name: "Amount",
      selector: (row) => row.amount || "",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <div className="font-bold text-green-600 text-lg">
          ₹{Number(row.amount).toLocaleString()}
        </div>
      ),
    },
    {
      name: "Updated By",
      selector: (row) => row.updated_by_name || "-",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <div className="text-sm">
          {row.updated_by_name ? (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {row.updated_by_name}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      name: "PAN Details",
      selector: (row) => row.pan_no || "",
      sortable: true,
      width: "160px",
      cell: (row) => (
        <div className="text-left text-sm">
          <div className="font-mono">{row.pan_no}</div>
          <div className="text-gray-600 truncate">{row.pan_name}</div>
        </div>
      ),
    },
    {
      name: "Bank Details",
      selector: (row) => row.bank_name || "",
      sortable: true,
      width: "200px",
      cell: (row) => (
        <div className="text-left text-sm">
          <div className="font-semibold text-gray-900 truncate">{row.bank_name}</div>
          <div className="text-gray-600 truncate">{row.bank_acc_holder_name}</div>
          <div className="font-mono text-xs text-gray-500">
            {row.bank_acc_no} • {row.bank_ifsc_no}
          </div>
        </div>
      ),
    },
    {
      name: "Dates",
      selector: (row) => row.entry_date,
      sortable: true,
      width: "160px",
      cell: (row) => (
        <div className="text-xs text-left">
          <div className="text-gray-900">
            <strong>Entry:</strong> {row.entry_date ? new Date(row.entry_date).toLocaleDateString() : "-"}
          </div>
          <div className="text-gray-600">
            <strong>Created:</strong> {row.create_at ? new Date(row.create_at).toLocaleDateString() : "-"}
          </div>
        </div>
      ),
    },
    {
      name: "Financial Year",
      selector: (row) => row.financial_year || "",
      sortable: true,
      center: true,
      width: "120px",
      cell: (row) => (
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
          {row.financial_year}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) =>
        currentStatus === "Success" ? (
          <button
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-sm font-semibold"
            onClick={() => updateSuccessToReject(row.id, row.reject_reason)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        ) : null,
      center: true,
      width: "120px",
      omit: currentStatus !== "Success",
    },
    {
      name: "Reject Reason",
      cell: (row) =>
        currentStatus === "Success" ? (
          <select
            className="w-full max-w-[180px] p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
            value={row.reject_reason || ""}
            onChange={(e) => handleReasonChange(row.id, e.target.value)}
          >
            <option value="" disabled>
              Select Reason
            </option>
            <option value="Invalid Bank Name">Invalid Bank Name</option>
            <option value="Incorrect IFSC code">IFSC code incorrect</option>
            <option value="Bank detail not found">Bank detail not found</option>
            <option value="Other">Other</option>
          </select>
        ) : currentStatus === "Rejected" ? (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
            {row.reject_reason || ""}
          </span>
        ) : null,
      center: true,
      width: "200px",
      omit: currentStatus === "Pending",
    },
  ];

  const customStyles = {
    table: {
      style: {
        backgroundColor: "#fff",
        borderRadius: "1rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid #e5e7eb",
      },
    },
    headRow: {
      style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontSize: "0.75rem",
        fontWeight: "700",
        textTransform: "uppercase",
        color: "#fff",
        letterSpacing: "0.05em",
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        paddingLeft: "1rem",
        paddingRight: "1rem",
        color: "#fff",
      },
    },
    rows: {
      style: {
        fontSize: "0.875rem",
        minHeight: "64px",
        "&:nth-child(even)": {
          backgroundColor: "#f8fafc",
        },
        "&:hover": {
          backgroundColor: "#f1f5f9",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        },
        transition: "all 0.2s ease",
      },
    },
    cells: {
      style: {
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      },
    },
    pagination: {
      style: {
        border: "none",
        paddingTop: "1.5rem",
        backgroundColor: "#f8fafc",
        borderRadius: "0 0 1rem 1rem",
      },
    },
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "from-yellow-500 to-orange-500";
      case "Success":
        return "from-green-500 to-emerald-500";
      case "Rejected":
        return "from-red-500 to-rose-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Success":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Rejected":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <div className="container mx-auto max-w-7xl">
            
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Withdrawal Management
                  </h1>
                  <p className="text-gray-600 mt-1">Manage and process withdrawal requests efficiently</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-xl font-bold text-gray-900">{totalItems}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Status</p>
                      <p className="text-xl font-bold text-gray-900">{currentStatus}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Settlement Date</p>
                      <p className="text-sm font-medium text-gray-900">{settlementDate || "Not Set"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Page</p>
                      <p className="text-xl font-bold text-gray-900">{currentPage}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Main Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              
              {/* Enhanced Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Withdrawal Details
                    </h2>
                    <p className="text-blue-100 mt-1">Process and manage withdrawal requests</p>
                  </div>
                  
                  {/* Status Filter Buttons */}
                  <div className="flex gap-2">
                    {["Pending", "Success", "Rejected"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setCurrentStatus(status);
                          setCurrentPage(1);
                          loadWithdrawHistory(
                            status,
                            1,
                            sortField,
                            sortDirection,
                            itemsPerPage
                          );
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
                          currentStatus === status
                            ? `bg-gradient-to-r ${getStatusColor(status)} text-white shadow-lg`
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {getStatusIcon(status)}
                        <span>{status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Enhanced Filters Section */}
                {currentStatus === "Pending" && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-6 border border-blue-100">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Filter by ID */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          Filter by Max ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={filterId}
                            onChange={handleFilterIdInput}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
                            placeholder="Enter Max ID"
                            min="2"
                          />
                          <button
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                            onClick={filterWithdrawById}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filter</span>
                          </button>
                        </div>
                      </div>

                      {/* Bulk Action */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Bulk Actions
                        </label>
                        <button
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                          onClick={updatePendingToSuccess}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Mark Selected as Success</span>
                        </button>
                      </div>

                      {/* Settlement Date */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Expected Settlement Date
                        </label>
                        <div className="text-xs text-gray-600 mb-2">
                          Current: <span className="font-semibold">{settlementDate}</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
                          />
                          <button
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                            onClick={updateSettlementDate}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Update</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Enhanced Table Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-semibold text-gray-700">Rows per page:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          const newLimit = Number(e.target.value);
                          setItemsPerPage(newLimit);
                          setCurrentPage(1);
                          loadWithdrawHistory(
                            currentStatus,
                            1,
                            sortField,
                            sortDirection,
                            newLimit
                          );
                        }}
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      >
                        {[10, 20, 50].map((limit) => (
                          <option key={limit} value={limit}>
                            {limit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Loading Indicator */}
                  {loading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">Loading...</span>
                    </div>
                  )}
                </div>

                {/* Enhanced Data Table */}
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <DataTable
                    columns={columns}
                    data={data}
                    progressPending={loading}
                    pagination={false}
                    onSort={handleSort}
                    sortServer
                    customStyles={customStyles}
                    noDataComponent={
                      <div className="text-center py-12">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No withdrawal history found</h3>
                        <p className="text-gray-600">There are no records matching your current filters.</p>
                      </div>
                    }
                    selectableRows={currentStatus === "Pending"}
                    onSelectedRowsChange={({ allSelected }) =>
                      handleSelectAll(allSelected)
                    }
                  />
                </div>

                {/* Enhanced Pagination */}
                <div className="mt-6 bg-gray-50 rounded-xl p-4">
                  <CustomPagination
                    rowsPerPage={itemsPerPage}
                    totalRows={totalItems}
                    currentPage={currentPage}
                    onChangePage={(page) => {
                      setCurrentPage(page);
                      loadWithdrawHistory(
                        currentStatus,
                        page,
                        sortField,
                        sortDirection,
                        itemsPerPage
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WithdrawList;